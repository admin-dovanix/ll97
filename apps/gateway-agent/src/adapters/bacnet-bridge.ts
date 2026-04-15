import { parseCommandPayload } from "../lib/shared.js";
import type {
  GatewayAssetSnapshot,
  GatewayDispatchRecord,
  GatewaySnapshotPayload,
  GatewayTelemetryEvent
} from "../types.js";
import type { GatewayAdapter, GatewayAdapterConfig, GatewayCommandResult } from "./types.js";

type BridgeCommandResponse =
  | {
      success?: boolean;
      appliedValue?: string;
      errorMessage?: string;
      responseJson?: string;
      [key: string]: unknown;
    }
  | undefined;

export class BacnetBridgeGatewayAdapter implements GatewayAdapter {
  readonly type = "bacnet-bridge";
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly apiKeyHeader: string;
  private readonly discoveryPath: string;
  private readonly telemetryPath: string;
  private readonly commandPath: string;

  constructor(config: GatewayAdapterConfig) {
    if (!config.bridgeBaseUrl) {
      throw new Error("AIRWISE_GATEWAY_BRIDGE_BASE_URL is required for the bacnet-bridge adapter.");
    }

    this.baseUrl = config.bridgeBaseUrl.replace(/\/$/, "");
    this.apiKey = config.bridgeApiKey;
    this.apiKeyHeader = config.bridgeApiKeyHeader ?? "x-bridge-api-key";
    this.discoveryPath = this.normalizePath(config.bridgeDiscoveryPath ?? "/discovery");
    this.telemetryPath = this.normalizePath(config.bridgeTelemetryPath ?? "/telemetry");
    this.commandPath = this.normalizePath(config.bridgeCommandPath ?? "/commands");
  }

  getMetadata() {
    return {
      adapterType: this.type,
      discoverySource: `${this.baseUrl}${this.discoveryPath}`,
      telemetrySource: `${this.baseUrl}${this.telemetryPath}`
    };
  }

  async getDiscoverySnapshot() {
    const payload = await this.request<unknown>(this.discoveryPath);

    if (this.isSnapshotPayload(payload)) {
      return payload;
    }

    throw new Error("BACnet bridge discovery endpoint did not return a valid snapshot payload.");
  }

  async collectTelemetry() {
    const payload = await this.request<unknown>(this.telemetryPath);

    if (this.isTelemetryEnvelope(payload)) {
      return payload.events;
    }

    if (this.isSnapshotPayload(payload)) {
      return this.snapshotToTelemetry(payload);
    }

    throw new Error("BACnet bridge telemetry endpoint did not return valid telemetry events or a snapshot payload.");
  }

  async applyCommand(dispatch: GatewayDispatchRecord): Promise<GatewayCommandResult> {
    const payload = parseCommandPayload(dispatch.payloadJson);
    const bridgeResponse = await this.request<BridgeCommandResponse>(this.commandPath, {
      method: "POST",
      body: JSON.stringify({
        dispatchId: dispatch.id,
        commandId: dispatch.commandId,
        pointId: dispatch.pointId,
        command: payload
      })
    });

    if (bridgeResponse?.success === false) {
      return {
        success: false,
        errorMessage: bridgeResponse.errorMessage ?? "BACnet bridge rejected the command.",
        responseJson: bridgeResponse.responseJson ?? JSON.stringify(bridgeResponse)
      };
    }

    return {
      success: true,
      appliedValue:
        typeof bridgeResponse?.appliedValue === "string" ? bridgeResponse.appliedValue : payload.requestedValue,
      responseJson: bridgeResponse?.responseJson ?? JSON.stringify(bridgeResponse ?? { accepted: true })
    };
  }

  private normalizePath(path: string) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(this.apiKey ? { [this.apiKeyHeader]: this.apiKey } : {}),
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BACnet bridge request failed ${response.status} ${response.statusText}: ${text}`);
    }

    return (await response.json()) as T;
  }

  private isSnapshotPayload(value: unknown): value is GatewaySnapshotPayload {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      Array.isArray((value as GatewaySnapshotPayload).assets)
    );
  }

  private isTelemetryEnvelope(value: unknown): value is { events: GatewayTelemetryEvent[] } {
    return (
      Boolean(value) &&
      typeof value === "object" &&
      Array.isArray((value as { events?: GatewayTelemetryEvent[] }).events)
    );
  }

  private snapshotToTelemetry(snapshot: GatewaySnapshotPayload) {
    return snapshot.assets.flatMap((asset: GatewayAssetSnapshot) =>
      asset.points.map(
        (point) =>
          ({
            assetKey: asset.assetKey,
            pointKey: point.pointKey,
            objectIdentifier: point.objectIdentifier,
            value: point.presentValue ?? "auto",
            unit: point.unit,
            qualityFlag: point.qualityFlag ?? "ok"
          }) satisfies GatewayTelemetryEvent
      )
    );
  }
}
