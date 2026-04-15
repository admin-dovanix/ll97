import { pointKey, sampleSnapshot } from "../lib/shared.js";
import type { BridgeCommandInput, BridgeCommandResult, BridgePoint, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";
import type { BridgeBackend, BridgeBackendConfig } from "./types.js";

export class SimulatedBridgeBackend implements BridgeBackend {
  readonly type = "simulated";
  private readonly snapshot: BridgeSnapshot;
  private readonly pointIndex = new Map<string, BridgePoint>();
  private telemetryCycle = 0;

  constructor(_config: BridgeBackendConfig) {
    this.snapshot = structuredClone(sampleSnapshot);

    for (const asset of this.snapshot.assets) {
      for (const point of asset.points) {
        this.pointIndex.set(pointKey(asset.assetKey, point.pointKey, point.objectIdentifier), point);
      }
    }
  }

  getMetadata() {
    return {
      backendType: this.type,
      assetCount: this.snapshot.assets.length
    };
  }

  async getDiscoverySnapshot() {
    this.snapshot.observedAt = new Date().toISOString();
    return this.snapshot;
  }

  async getTelemetryEvents() {
    this.updateAnalogPoints();

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
        errorMessage: "Point not found in simulated bridge state."
      };
    }

    point.presentValue = input.command.requestedValue;
    this.applyLinkedState(point.canonicalPointType, input.command.requestedValue);

    return {
      success: true,
      appliedValue: input.command.requestedValue,
      responseJson: JSON.stringify({
        bridge: "simulated",
        dispatchId: input.dispatchId
      })
    };
  }

  private updateAnalogPoints() {
    this.telemetryCycle += 1;
    const schedule = this.pointIndex.get(pointKey("corridor_ahu", "corridor_schedule"));
    const override = this.pointIndex.get(pointKey("corridor_ahu", "corridor_manual_override"));
    const occupied = String(schedule?.presentValue ?? "occupied").toLowerCase() === "occupied";
    const overrideActive = String(override?.presentValue ?? "auto").toLowerCase() !== "auto";

    const co2 = this.pointIndex.get(pointKey("corridor_ahu", "corridor_co2"));
    const temperature = this.pointIndex.get(pointKey("corridor_ahu", "corridor_temperature"));
    const fanStatus = this.pointIndex.get(pointKey("corridor_ahu", "corridor_fan_status"));

    if (co2) {
      const baseline = occupied ? 820 : 560;
      const swing = Math.round(Math.sin(this.telemetryCycle / 2) * 55);
      co2.presentValue = baseline + swing + (overrideActive ? 25 : 0);
    }

    if (temperature) {
      temperature.presentValue = Number((70 + Math.sin(this.telemetryCycle / 3) * 2.5).toFixed(1));
    }

    if (fanStatus) {
      fanStatus.presentValue = occupied || overrideActive ? "on" : "off";
    }

    this.snapshot.observedAt = new Date().toISOString();
  }

  private applyLinkedState(pointType: string | undefined, nextValue: string) {
    if (pointType !== "schedule" && pointType !== "occupancy_mode") {
      return;
    }

    const fanStatus = this.pointIndex.get(pointKey("corridor_ahu", "corridor_fan_status"));
    const manualOverride = this.pointIndex.get(pointKey("corridor_ahu", "corridor_manual_override"));
    if (fanStatus) {
      fanStatus.presentValue = nextValue === "occupied" ? "on" : "off";
    }
    if (manualOverride && nextValue === "unoccupied") {
      manualOverride.presentValue = "auto";
    }
  }
}
