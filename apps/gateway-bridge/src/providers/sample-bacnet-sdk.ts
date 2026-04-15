import { pointKey, sampleSnapshot } from "../lib/shared.js";
import type { BridgeCommandInput, BridgeCommandResult, BridgePoint, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";
import type { BacnetSdkProvider } from "../backends/types.js";

type SampleProviderConfig = {
  deviceName?: string;
  vendorName?: string;
};

class SampleBacnetSdkProvider implements BacnetSdkProvider {
  private readonly snapshot: BridgeSnapshot;
  private readonly pointIndex = new Map<string, BridgePoint>();
  private telemetryCycle = 0;

  constructor(config: SampleProviderConfig) {
    this.snapshot = structuredClone(sampleSnapshot);
    if (config.deviceName) {
      this.snapshot.assets[0]!.systemName = config.deviceName;
    }
    if (config.vendorName) {
      this.snapshot.assets[0]!.vendor = config.vendorName;
    }

    for (const asset of this.snapshot.assets) {
      for (const point of asset.points) {
        this.pointIndex.set(pointKey(asset.assetKey, point.pointKey, point.objectIdentifier), point);
      }
    }
  }

  getMetadata() {
    return {
      provider: "sample-bacnet-sdk",
      assetCount: this.snapshot.assets.length
    };
  }

  async getDiscoverySnapshot() {
    this.snapshot.observedAt = new Date().toISOString();
    return this.snapshot;
  }

  async getTelemetryEvents() {
    this.telemetryCycle += 1;
    const co2 = this.pointIndex.get(pointKey("corridor_ahu", "corridor_co2"));
    const temperature = this.pointIndex.get(pointKey("corridor_ahu", "corridor_temperature"));

    if (co2) {
      co2.presentValue = 700 + Math.round(Math.sin(this.telemetryCycle / 2) * 45);
    }
    if (temperature) {
      temperature.presentValue = Number((70 + Math.cos(this.telemetryCycle / 3) * 1.8).toFixed(1));
    }

    this.snapshot.observedAt = new Date().toISOString();

    return this.snapshot.assets.flatMap((asset) =>
      asset.points.map(
        (point) =>
          ({
            assetKey: asset.assetKey,
            pointKey: point.pointKey,
            objectIdentifier: point.objectIdentifier,
            value: point.presentValue ?? "auto",
            unit: point.unit,
            qualityFlag: point.qualityFlag ?? "ok"
          }) satisfies BridgeTelemetryEvent
      )
    );
  }

  async applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult> {
    const key = pointKey(input.command.assetKey, input.command.pointKey, input.command.objectIdentifier);
    const point = this.pointIndex.get(key);

    if (!point || typeof input.command.requestedValue !== "string") {
      return {
        success: false,
        errorMessage: "Point not found in sample BACnet SDK provider."
      };
    }

    point.presentValue = input.command.requestedValue;

    return {
      success: true,
      appliedValue: input.command.requestedValue,
      responseJson: JSON.stringify({
        provider: "sample-bacnet-sdk",
        dispatchId: input.dispatchId
      })
    };
  }
}

export function createBacnetSdkProvider(config: Record<string, unknown>) {
  return new SampleBacnetSdkProvider({
    deviceName: typeof config.deviceName === "string" ? config.deviceName : undefined,
    vendorName: typeof config.vendorName === "string" ? config.vendorName : undefined
  });
}
