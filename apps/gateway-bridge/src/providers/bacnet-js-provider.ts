import BACnetClientModule, {
  ApplicationTag,
  BinaryPV,
  EngineeringUnits,
  ObjectType,
  PropertyIdentifier,
  type BACNetAddress,
  type BACNetAppData,
  type BACNetObjectID,
  type BACNetReadAccessSpecification,
  type ClientOptions,
  type DecodeAcknowledgeMultipleResult,
  type IAMResult
} from "@bacnet-js/client";
import { z } from "zod";
import type { BacnetSdkProvider } from "../backends/types.js";
import type { BridgeAsset, BridgeCommandInput, BridgeCommandResult, BridgePoint, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";

const pointSchema = z.object({
  assetKey: z.string().optional(),
  pointKey: z.string().min(1),
  objectIdentifier: z.string().min(1),
  objectName: z.string().optional(),
  canonicalPointType: z.string().optional(),
  unit: z.string().optional(),
  isWritable: z.boolean().optional(),
  isWhitelisted: z.boolean().optional(),
  safetyCategory: z.string().optional(),
  valueType: z
    .enum(["auto", "real", "double", "signed", "unsigned", "boolean", "character_string", "enumerated", "binary"])
    .optional(),
  enumMap: z.record(z.coerce.number()).optional(),
  readProperty: z.union([z.string(), z.number().int()]).optional(),
  readArrayIndex: z.number().int().optional(),
  writeProperty: z.union([z.string(), z.number().int()]).optional(),
  writeArrayIndex: z.number().int().optional(),
  writePriority: z.number().int().min(1).max(16).optional()
});

const assetSchema = z.object({
  assetKey: z.string().min(1),
  systemName: z.string().optional(),
  assetType: z.string().optional(),
  protocol: z.string().optional(),
  vendor: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  points: z.array(pointSchema).min(1)
});

const providerConfigSchema = z
  .object({
    targetAddress: z.string().min(1),
    deviceInstance: z.number().int().nonnegative().optional(),
    systemName: z.string().optional(),
    vendorName: z.string().optional(),
    location: z.string().optional(),
    defaultAssetKey: z.string().optional(),
    defaultAssetType: z.string().optional(),
    discoveryTimeoutMs: z.number().int().positive().optional(),
    skipWhoIs: z.boolean().optional(),
    writePriority: z.number().int().min(1).max(16).optional(),
    client: z
      .object({
        port: z.number().int().positive().optional(),
        interface: z.string().optional(),
        broadcastAddress: z.string().optional(),
        apduTimeout: z.number().int().positive().optional(),
        reuseAddr: z.boolean().optional()
      })
      .optional(),
    points: z.array(pointSchema).optional(),
    assets: z.array(assetSchema).optional()
  })
  .superRefine((value, ctx) => {
    if ((!value.points || value.points.length === 0) && (!value.assets || value.assets.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either points or assets in AIRWISE_GATEWAY_BRIDGE_SDK_CONFIG_JSON."
      });
    }
  });

type ProviderConfig = z.infer<typeof providerConfigSchema>;
type PointConfig = z.infer<typeof pointSchema>;
type AssetConfig = z.infer<typeof assetSchema>;

type ValueType = NonNullable<PointConfig["valueType"]>;

type NormalizedPoint = PointConfig & {
  assetKey: string;
  objectId: BACNetObjectID;
  objectIdentifier: string;
  readPropertyId: PropertyIdentifier;
  writePropertyId: PropertyIdentifier;
  valueType: ValueType;
  reverseEnumMap: Map<number, string>;
};

type NormalizedAsset = Omit<AssetConfig, "points"> & {
  systemName: string;
  protocol: string;
  points: NormalizedPoint[];
};

type PointMetadata = {
  objectName?: string;
  unit?: string;
};

type ReadIndex = Map<string, BACNetAppData[]>;

const COMMON_UNIT_LABELS: Partial<Record<EngineeringUnits, string>> = {
  [EngineeringUnits.NO_UNITS]: "enum",
  [EngineeringUnits.DEGREES_FAHRENHEIT]: "F",
  [EngineeringUnits.DEGREES_CELSIUS]: "C",
  [EngineeringUnits.PARTS_PER_MILLION]: "ppm",
  [EngineeringUnits.PERCENT]: "%",
  [EngineeringUnits.HOURS]: "hours",
  [EngineeringUnits.MINUTES]: "minutes"
};

class BacnetJsProvider implements BacnetSdkProvider {
  private readonly config: ProviderConfig;
  private readonly receiver: BACNetAddress;
  private readonly client: InstanceType<typeof BACnetClientCtor>;
  private readonly assets: NormalizedAsset[];
  private readonly pointLookup = new Map<string, NormalizedPoint>();
  private readonly pointMetadata = new Map<string, PointMetadata>();
  private readonly lastValues = new Map<string, string | number>();
  private lastIdentity: IAMResult | null = null;
  private lastDiscoveryAt: string | null = null;
  private lastPollAt: string | null = null;
  private lastClientError: string | null = null;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.receiver = { address: config.targetAddress };
    this.assets = normalizeAssets(config);
    this.client = new BACnetClientCtor(buildClientOptions(config.client));
    this.client.on("error", (error) => {
      this.lastClientError = error instanceof Error ? error.message : String(error);
    });

    for (const asset of this.assets) {
      for (const point of asset.points) {
        this.pointLookup.set(pointLookupKey(asset.assetKey, point.pointKey, point.objectIdentifier), point);
      }
    }
  }

  getMetadata() {
    return {
      provider: "bacnet-js",
      targetAddress: this.config.targetAddress,
      deviceInstance: this.config.deviceInstance ?? this.lastIdentity?.deviceId ?? null,
      vendorId: this.lastIdentity?.vendorId ?? null,
      assetCount: this.assets.length,
      pointCount: this.assets.reduce((sum, asset) => sum + asset.points.length, 0),
      lastDiscoveryAt: this.lastDiscoveryAt,
      lastPollAt: this.lastPollAt,
      lastClientError: this.lastClientError
    };
  }

  async getDiscoverySnapshot(): Promise<BridgeSnapshot> {
    const identity = await this.resolveIdentity();
    await this.refreshPointMetadata();
    this.lastDiscoveryAt = new Date().toISOString();

    const observedAt = this.lastDiscoveryAt;
    const deviceName = await this.resolveDeviceName(identity?.deviceId);

    return {
      observedAt,
      assets: this.assets.map((asset, index) => buildBridgeAsset(asset, {
        defaultSystemName: index === 0 ? deviceName : undefined,
        vendorName: identity ? `Vendor ${identity.vendorId}` : undefined,
        location: this.config.location
      }, this.pointMetadata))
    };
  }

  async getTelemetryEvents(): Promise<BridgeTelemetryEvent[]> {
    const readResult = await this.client.readPropertyMultiple(this.receiver, buildTelemetryReadSpecs(this.assets));
    const readIndex = indexReadResult(readResult);
    const observedAt = new Date().toISOString();
    this.lastPollAt = observedAt;

    return this.assets.flatMap((asset) =>
      asset.points.flatMap((point) => {
        const values = readIndex.get(readResultKey(point.objectId, point.readPropertyId, point.readArrayIndex));
        const decoded = decodeTelemetryValue(values, point);
        const cachedKey = pointLookupKey(asset.assetKey, point.pointKey, point.objectIdentifier);

        if (decoded.value === undefined) {
          const fallback = this.lastValues.get(cachedKey);
          if (fallback === undefined) {
            return [];
          }

          return [
            {
              assetKey: asset.assetKey,
              pointKey: point.pointKey,
              objectIdentifier: point.objectIdentifier,
              value: fallback,
              unit: resolvePointUnit(point, this.pointMetadata.get(pointMetadataKey(point))),
              qualityFlag: "fault"
            } satisfies BridgeTelemetryEvent
          ];
        }

        this.lastValues.set(cachedKey, decoded.value);

        return [
          {
            assetKey: asset.assetKey,
            pointKey: point.pointKey,
            objectIdentifier: point.objectIdentifier,
            value: decoded.value,
            unit: resolvePointUnit(point, this.pointMetadata.get(pointMetadataKey(point))),
            qualityFlag: decoded.qualityFlag ?? "ok"
          } satisfies BridgeTelemetryEvent
        ];
      })
    );
  }

  async applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult> {
    const point = resolveCommandPoint(input, this.pointLookup);
    if (!point) {
      return {
        success: false,
        errorMessage: `Point ${input.pointId} is not configured in the bacnet-js provider.`
      };
    }

    if (!point.isWritable) {
      return {
        success: false,
        errorMessage: `Point ${point.pointKey} is not writable in the bacnet-js provider config.`
      };
    }

    const requestedValue = input.command.requestedValue?.trim();
    if (!requestedValue) {
      return {
        success: false,
        errorMessage: "Requested value is required for BACnet write commands."
      };
    }

    try {
      const values = encodeRequestedValue(point, requestedValue);
      await this.client.writeProperty(this.receiver, point.objectId, point.writePropertyId, values, {
        arrayIndex: point.writeArrayIndex,
        priority: point.writePriority ?? this.config.writePriority
      });

      this.lastValues.set(pointLookupKey(point.assetKey, point.pointKey, point.objectIdentifier), requestedValue);

      return {
        success: true,
        appliedValue: requestedValue,
        responseJson: JSON.stringify({
          provider: "bacnet-js",
          targetAddress: this.config.targetAddress,
          objectIdentifier: point.objectIdentifier,
          property: PropertyIdentifier[point.writePropertyId] ?? point.writePropertyId
        })
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : "BACnet write failed.",
        responseJson: JSON.stringify({
          provider: "bacnet-js",
          targetAddress: this.config.targetAddress,
          objectIdentifier: point.objectIdentifier
        })
      };
    }
  }

  private async resolveIdentity() {
    if (this.lastIdentity || this.config.skipWhoIs) {
      return this.lastIdentity;
    }

    const timeoutMs = this.config.discoveryTimeoutMs ?? 2500;
    this.lastIdentity = await new Promise<IAMResult | null>((resolve) => {
      const timer = setTimeout(() => {
        this.client.off("iAm", handleIAm);
        resolve(null);
      }, timeoutMs);

      const handleIAm = (content: { payload: IAMResult }) => {
        if (!isMatchingIdentity(content.payload, this.config.targetAddress, this.config.deviceInstance)) {
          return;
        }

        clearTimeout(timer);
        this.client.off("iAm", handleIAm);
        resolve(content.payload);
      };

      this.client.on("iAm", handleIAm);
      this.client.whoIs(this.receiver, this.config.deviceInstance !== undefined
        ? { lowLimit: this.config.deviceInstance, highLimit: this.config.deviceInstance }
        : undefined);
    });

    return this.lastIdentity;
  }

  private async resolveDeviceName(deviceId?: number) {
    if (this.config.systemName) {
      return this.config.systemName;
    }

    const deviceInstance = deviceId ?? this.config.deviceInstance;
    if (deviceInstance === undefined) {
      return this.assets[0]?.systemName ?? "BACnet Device";
    }

    try {
      const result = await this.client.readProperty(
        this.receiver,
        { type: ObjectType.DEVICE, instance: deviceInstance },
        PropertyIdentifier.OBJECT_NAME
      );
      const decoded = decodeAppDataList(result.values, undefined);
      return typeof decoded === "string" && decoded.length > 0
        ? decoded
        : this.assets[0]?.systemName ?? `BACnet Device ${deviceInstance}`;
    } catch {
      return this.assets[0]?.systemName ?? `BACnet Device ${deviceInstance}`;
    }
  }

  private async refreshPointMetadata() {
    const specs = buildMetadataReadSpecs(this.assets);
    if (specs.length === 0) {
      return;
    }

    try {
      const result = await this.client.readPropertyMultiple(this.receiver, specs);
      const readIndex = indexReadResult(result);

      for (const asset of this.assets) {
        for (const point of asset.points) {
          const objectName = decodeAppDataList(
            readIndex.get(readResultKey(point.objectId, PropertyIdentifier.OBJECT_NAME)),
            point
          );
          const units = decodeAppDataList(
            readIndex.get(readResultKey(point.objectId, PropertyIdentifier.UNITS)),
            point
          );

          this.pointMetadata.set(pointMetadataKey(point), {
            objectName: typeof objectName === "string" && objectName.length > 0 ? objectName : undefined,
            unit: typeof units === "string" && units.length > 0 ? units : undefined
          });
        }
      }
    } catch {
      // Metadata enrichment is best-effort; telemetry can still run with configured values.
    }
  }
}

const BACnetClientCtor = resolveBacnetClientConstructor();

function buildClientOptions(config?: ProviderConfig["client"]): ClientOptions {
  return {
    ...(config?.port !== undefined ? { port: config.port } : {}),
    ...(config?.interface ? { interface: config.interface } : {}),
    ...(config?.broadcastAddress ? { broadcastAddress: config.broadcastAddress } : {}),
    ...(config?.apduTimeout !== undefined ? { apduTimeout: config.apduTimeout } : {}),
    ...(config?.reuseAddr !== undefined ? { reuseAddr: config.reuseAddr } : {})
  };
}

function normalizeAssets(config: ProviderConfig): NormalizedAsset[] {
  const configuredAssets: AssetConfig[] =
    config.assets && config.assets.length > 0
      ? config.assets
      : [
          {
            assetKey: config.defaultAssetKey ?? "bacnet_device",
            systemName: config.systemName,
            assetType: config.defaultAssetType,
            vendor: config.vendorName,
            location: config.location,
            protocol: "BACnet/IP",
            status: "active",
            points: config.points ?? []
          }
        ];

  return configuredAssets.map((asset) => ({
    ...asset,
    systemName: asset.systemName ?? config.systemName ?? asset.assetKey,
    protocol: asset.protocol ?? "BACnet/IP",
    points: asset.points.map((point) => normalizePoint(asset.assetKey, point))
  }));
}

function normalizePoint(assetKey: string, point: PointConfig): NormalizedPoint {
  const enumMap = point.enumMap ?? {};
  const reverseEnumMap = new Map<number, string>();
  for (const [label, value] of Object.entries(enumMap)) {
    reverseEnumMap.set(value, label);
  }

  const objectId = parseObjectIdentifier(point.objectIdentifier);
  const readPropertyId = parsePropertyIdentifier(point.readProperty ?? PropertyIdentifier.PRESENT_VALUE);
  const writePropertyId = parsePropertyIdentifier(point.writeProperty ?? readPropertyId);

  return {
    ...point,
    assetKey: point.assetKey ?? assetKey,
    objectId,
    objectIdentifier: `${objectTypeToIdentifier(objectId.type)},${objectId.instance}`,
    readPropertyId,
    writePropertyId,
    valueType: point.valueType ?? "auto",
    reverseEnumMap
  };
}

function buildBridgeAsset(
  asset: NormalizedAsset,
  defaults: { defaultSystemName?: string; vendorName?: string; location?: string },
  metadata: Map<string, PointMetadata>
): BridgeAsset {
  return {
    assetKey: asset.assetKey,
    systemName: asset.systemName || defaults.defaultSystemName || asset.assetKey,
    assetType: asset.assetType,
    protocol: asset.protocol,
    vendor: asset.vendor ?? defaults.vendorName,
    location: asset.location ?? defaults.location,
    status: asset.status ?? "active",
    points: asset.points.map((point) => buildBridgePoint(point, metadata.get(pointMetadataKey(point))))
  };
}

function buildBridgePoint(point: NormalizedPoint, metadata?: PointMetadata): BridgePoint {
  return {
    assetKey: point.assetKey,
    pointKey: point.pointKey,
    objectIdentifier: point.objectIdentifier,
    objectName: point.objectName ?? metadata?.objectName ?? point.pointKey,
    canonicalPointType: point.canonicalPointType,
    unit: resolvePointUnit(point, metadata),
    isWritable: point.isWritable,
    isWhitelisted: point.isWhitelisted,
    safetyCategory: point.safetyCategory
  };
}

function buildTelemetryReadSpecs(assets: NormalizedAsset[]): BACNetReadAccessSpecification[] {
  const grouped = new Map<string, BACNetReadAccessSpecification>();

  for (const asset of assets) {
    for (const point of asset.points) {
      const key = objectResultKey(point.objectId);
      const spec = grouped.get(key) ?? { objectId: point.objectId, properties: [] };
      if (!spec.properties.some((property) => property.id === point.readPropertyId && property.index === (point.readArrayIndex ?? 0xffffffff))) {
        spec.properties.push({
          id: point.readPropertyId,
          index: point.readArrayIndex ?? 0xffffffff
        });
      }
      grouped.set(key, spec);
    }
  }

  return Array.from(grouped.values());
}

function buildMetadataReadSpecs(assets: NormalizedAsset[]): BACNetReadAccessSpecification[] {
  const grouped = new Map<string, BACNetReadAccessSpecification>();

  for (const asset of assets) {
    for (const point of asset.points) {
      const key = objectResultKey(point.objectId);
      const spec = grouped.get(key) ?? { objectId: point.objectId, properties: [] };
      addProperty(spec.properties, PropertyIdentifier.OBJECT_NAME);
      addProperty(spec.properties, PropertyIdentifier.UNITS);
      grouped.set(key, spec);
    }
  }

  return Array.from(grouped.values());
}

function addProperty(properties: BACNetReadAccessSpecification["properties"], id: PropertyIdentifier, index = 0xffffffff) {
  if (!properties.some((property) => property.id === id && property.index === index)) {
    properties.push({ id, index });
  }
}

function indexReadResult(result: DecodeAcknowledgeMultipleResult): ReadIndex {
  const index = new Map<string, BACNetAppData[]>();

  for (const item of result.values) {
    for (const property of item.values) {
      index.set(readResultKey(item.objectId, property.id, property.index), property.value as BACNetAppData[]);
    }
  }

  return index;
}

function decodeTelemetryValue(values: BACNetAppData[] | undefined, point: NormalizedPoint) {
  if (!values || values.length === 0) {
    return { qualityFlag: "fault" as const, value: undefined };
  }

  const decoded = decodeAppDataList(values, point);
  if (decoded === undefined) {
    return { qualityFlag: "fault" as const, value: undefined };
  }

  return { qualityFlag: "ok" as const, value: decoded };
}

function decodeAppDataList(values: BACNetAppData[] | undefined, point?: NormalizedPoint): string | number | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const first = values[0];
  if (!first) {
    return undefined;
  }

  if (first.type === ApplicationTag.ERROR) {
    return undefined;
  }

  switch (first.type) {
    case ApplicationTag.BOOLEAN:
      return first.value ? activeLabel(point) : inactiveLabel(point);
    case ApplicationTag.REAL:
    case ApplicationTag.DOUBLE:
    case ApplicationTag.UNSIGNED_INTEGER:
    case ApplicationTag.SIGNED_INTEGER:
      return Number(first.value);
    case ApplicationTag.CHARACTER_STRING:
      return String(first.value);
    case ApplicationTag.ENUMERATED: {
      const numericValue = Number(first.value);
      if (point?.reverseEnumMap.has(numericValue)) {
        return point.reverseEnumMap.get(numericValue);
      }

      if (point && isBinaryPoint(point)) {
        return numericValue === BinaryPV.ACTIVE ? activeLabel(point) : inactiveLabel(point);
      }

      const engineeringUnitName = EngineeringUnits[numericValue as EngineeringUnits];
      if (!point?.unit && engineeringUnitName) {
        return normalizeUnitLabel(numericValue as EngineeringUnits);
      }

      return numericValue;
    }
    case ApplicationTag.DATE:
    case ApplicationTag.TIME:
    case ApplicationTag.DATETIME:
      return first.value instanceof Date ? first.value.toISOString() : String(first.value);
    default: {
      if (typeof first.value === "number" || typeof first.value === "string") {
        return first.value;
      }

      try {
        return JSON.stringify(first.value);
      } catch {
        return String(first.value);
      }
    }
  }
}

function resolvePointUnit(point: NormalizedPoint, metadata?: PointMetadata) {
  return point.unit ?? metadata?.unit;
}

function encodeRequestedValue(point: NormalizedPoint, requestedValue: string): BACNetAppData[] {
  const valueType = resolveWriteValueType(point, requestedValue);

  switch (valueType) {
    case "real":
      return [{ type: ApplicationTag.REAL, value: parseNumber(requestedValue) }] as BACNetAppData[];
    case "double":
      return [{ type: ApplicationTag.DOUBLE, value: parseNumber(requestedValue) }] as BACNetAppData[];
    case "signed":
      return [{ type: ApplicationTag.SIGNED_INTEGER, value: parseInteger(requestedValue) }] as BACNetAppData[];
    case "unsigned": {
      const value = parseInteger(requestedValue);
      if (value < 0) {
        throw new Error(`Unsigned BACnet value cannot be negative: ${requestedValue}`);
      }
      return [{ type: ApplicationTag.UNSIGNED_INTEGER, value }] as BACNetAppData[];
    }
    case "boolean":
      return [{ type: ApplicationTag.BOOLEAN, value: parseBoolean(requestedValue) }] as BACNetAppData[];
    case "binary":
      return [{ type: ApplicationTag.ENUMERATED, value: parseBinary(requestedValue, point) as BinaryPV }] as BACNetAppData[];
    case "enumerated":
      return [{ type: ApplicationTag.ENUMERATED, value: parseEnumerated(requestedValue, point) as BinaryPV }] as BACNetAppData[];
    case "character_string":
    case "auto":
      return [{ type: ApplicationTag.CHARACTER_STRING, value: requestedValue }] as BACNetAppData[];
  }
}

function resolveWriteValueType(point: NormalizedPoint, requestedValue: string): ValueType {
  if (point.valueType !== "auto") {
    return point.valueType;
  }

  if (point.enumMap && Object.keys(point.enumMap).length > 0) {
    return "enumerated";
  }

  if (isBinaryPoint(point)) {
    return "binary";
  }

  if (requestedValue === "true" || requestedValue === "false") {
    return "boolean";
  }

  if (/^-?\d+(\.\d+)?$/.test(requestedValue)) {
    return point.objectId.type === ObjectType.ANALOG_INPUT ||
      point.objectId.type === ObjectType.ANALOG_OUTPUT ||
      point.objectId.type === ObjectType.ANALOG_VALUE
      ? "real"
      : "signed";
  }

  return "character_string";
}

function resolveCommandPoint(input: BridgeCommandInput, points: Map<string, NormalizedPoint>) {
  const byStructuredKey = pointLookupKey(
    input.command.assetKey ?? undefined,
    input.command.pointKey ?? undefined,
    input.command.objectIdentifier
  );
  if (points.has(byStructuredKey)) {
    return points.get(byStructuredKey);
  }

  return Array.from(points.values()).find((point) => point.objectIdentifier === input.command.objectIdentifier);
}

function pointLookupKey(assetKey?: string | null, pointKey?: string | null, objectIdentifier?: string) {
  return `${(assetKey ?? "unknown").trim().toUpperCase()}::${(pointKey ?? objectIdentifier ?? "unknown").trim().toUpperCase()}`;
}

function pointMetadataKey(point: NormalizedPoint) {
  return `${point.objectId.type}:${point.objectId.instance}`;
}

function objectResultKey(objectId: BACNetObjectID) {
  return `${objectId.type}:${objectId.instance}`;
}

function readResultKey(objectId: BACNetObjectID, propertyId: PropertyIdentifier, index = 0xffffffff) {
  return `${objectResultKey(objectId)}:${propertyId}:${index}`;
}

function parseObjectIdentifier(value: string): BACNetObjectID {
  const [rawType, rawInstance] = value.split(",").map((item) => item.trim());
  if (!rawType || !rawInstance) {
    throw new Error(`Invalid BACnet object identifier: ${value}`);
  }

  return {
    type: parseObjectType(rawType),
    instance: parseInteger(rawInstance)
  };
}

function parseObjectType(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value) as ObjectType;
  }

  const key = enumKey(value);
  const resolved = ObjectType[key as keyof typeof ObjectType];
  if (typeof resolved !== "number") {
    throw new Error(`Unknown BACnet object type: ${value}`);
  }

  return resolved as ObjectType;
}

function parsePropertyIdentifier(value: string | number) {
  if (typeof value === "number") {
    return value as PropertyIdentifier;
  }

  if (/^\d+$/.test(value)) {
    return Number(value) as PropertyIdentifier;
  }

  const key = enumKey(value);
  const resolved = PropertyIdentifier[key as keyof typeof PropertyIdentifier];
  if (typeof resolved !== "number") {
    throw new Error(`Unknown BACnet property identifier: ${value}`);
  }

  return resolved as PropertyIdentifier;
}

function enumKey(value: string) {
  return value.trim().replace(/[\s-]+/g, "_").toUpperCase();
}

function objectTypeToIdentifier(objectType: ObjectType) {
  const key = ObjectType[objectType];
  return typeof key === "string" ? key.toLowerCase().replace(/_/g, "-") : String(objectType);
}

function parseNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a numeric BACnet value but received "${value}".`);
  }
  return parsed;
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected an integer BACnet value but received "${value}".`);
  }
  return parsed;
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on", "active"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "off", "inactive"].includes(normalized)) {
    return false;
  }
  throw new Error(`Unable to parse boolean BACnet value "${value}".`);
}

function parseEnumerated(value: string, point: NormalizedPoint) {
  const normalized = value.trim().toLowerCase();
  const mapped = point.enumMap?.[normalized];
  if (mapped !== undefined) {
    return mapped;
  }

  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  throw new Error(
    `Unable to map "${value}" to a BACnet enumerated value for ${point.pointKey}. Add enumMap in the provider config.`
  );
}

function parseBinary(value: string, point: NormalizedPoint) {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "active", "occupied", "override", activeLabel(point).toLowerCase()].includes(normalized)) {
    return BinaryPV.ACTIVE;
  }
  if (["0", "false", "no", "off", "inactive", "unoccupied", "auto", inactiveLabel(point).toLowerCase()].includes(normalized)) {
    return BinaryPV.INACTIVE;
  }
  return parseEnumerated(value, point);
}

function isBinaryPoint(point: NormalizedPoint) {
  return (
    point.valueType === "binary" ||
    point.objectId.type === ObjectType.BINARY_INPUT ||
    point.objectId.type === ObjectType.BINARY_OUTPUT ||
    point.objectId.type === ObjectType.BINARY_VALUE
  );
}

function activeLabel(point?: Pick<NormalizedPoint, "canonicalPointType">) {
  switch (point?.canonicalPointType) {
    case "fan_status":
      return "on";
    case "manual_override":
      return "override";
    default:
      return "active";
  }
}

function inactiveLabel(point?: Pick<NormalizedPoint, "canonicalPointType">) {
  switch (point?.canonicalPointType) {
    case "fan_status":
      return "off";
    case "manual_override":
      return "auto";
    default:
      return "inactive";
  }
}

function normalizeUnitLabel(value: EngineeringUnits) {
  const predefined = COMMON_UNIT_LABELS[value];
  if (predefined) {
    return predefined;
  }

  const key = EngineeringUnits[value];
  return typeof key === "string" ? key.toLowerCase().replace(/_/g, " ") : String(value);
}

function normalizeAddress(value: string) {
  const [host, port] = value.trim().toLowerCase().split(":");
  return {
    host,
    port: port ? Number.parseInt(port, 10) : undefined
  };
}

function isMatchingIdentity(identity: IAMResult, targetAddress: string, deviceInstance?: number) {
  if (deviceInstance !== undefined && identity.deviceId !== deviceInstance) {
    return false;
  }

  const target = normalizeAddress(targetAddress);
  const actual = normalizeAddress(identity.address);
  return target.host === actual.host && (target.port === undefined || actual.port === undefined || target.port === actual.port);
}

export function createBacnetSdkProvider(config: Record<string, unknown>) {
  return new BacnetJsProvider(providerConfigSchema.parse(config));
}

function resolveBacnetClientConstructor() {
  const candidate =
    typeof BACnetClientModule === "function"
      ? BACnetClientModule
      : typeof (BACnetClientModule as { default?: unknown }).default === "function"
        ? (BACnetClientModule as { default: typeof BACnetClientModule }).default
        : null;

  if (!candidate) {
    throw new Error("Unable to resolve BACnet client constructor from @bacnet-js/client.");
  }

  return candidate;
}
