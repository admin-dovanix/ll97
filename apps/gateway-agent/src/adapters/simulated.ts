import { parseCommandPayload, readDiscoverySnapshot } from "../lib/shared.js";
import type { GatewayDispatchRecord, GatewayTelemetryEvent } from "../types.js";
import type { GatewayAdapter, GatewayAdapterConfig, GatewayCommandResult } from "./types.js";

type PointState = {
  assetKey: string;
  pointKey?: string;
  objectIdentifier: string;
  objectName: string;
  canonicalPointType?: string;
  unit?: string;
  qualityFlag?: string;
  value: string | number;
};

export class SimulatedGatewayAdapter implements GatewayAdapter {
  readonly type = "simulated";
  private readonly discoverySnapshot;
  private readonly pointStates = new Map<string, PointState>();
  private telemetryCycle = 0;

  constructor(config: GatewayAdapterConfig) {
    this.discoverySnapshot = readDiscoverySnapshot(config.discoveryFile);
    this.seedPointStates();
  }

  getMetadata() {
    return {
      adapterType: this.type,
      trackedPointCount: this.pointStates.size,
      discoverySource: "built-in snapshot"
    };
  }

  async getDiscoverySnapshot() {
    return this.discoverySnapshot;
  }

  async collectTelemetry() {
    this.updateAnalogPointValues();
    return Array.from(this.pointStates.values()).map(
      (point) =>
        ({
          assetKey: point.assetKey,
          pointKey: point.pointKey,
          objectIdentifier: point.objectIdentifier,
          value: point.value,
          unit: point.unit,
          qualityFlag: point.qualityFlag ?? "ok"
        }) satisfies GatewayTelemetryEvent
    );
  }

  async applyCommand(dispatch: GatewayDispatchRecord): Promise<GatewayCommandResult> {
    const payload = parseCommandPayload(dispatch.payloadJson);
    const stateKey = this.pointStateKey(
      payload.assetKey ?? "unknown",
      payload.pointKey ?? undefined,
      payload.objectIdentifier ?? undefined
    );
    const point = this.pointStates.get(stateKey);

    if (!point || typeof payload.requestedValue !== "string") {
      return {
        success: false,
        errorMessage: "Point not found in simulated gateway state."
      };
    }

    point.value = payload.requestedValue;
    this.applyLinkedPointState(point.canonicalPointType, payload.requestedValue);
    return {
      success: true,
      appliedValue: payload.requestedValue,
      responseJson: JSON.stringify({
        adapterType: this.type,
        objectIdentifier: point.objectIdentifier
      })
    };
  }

  private seedPointStates() {
    for (const asset of this.discoverySnapshot.assets) {
      const assetKey = asset.assetKey ?? asset.systemName.toLowerCase().replace(/\s+/g, "_");
      for (const point of asset.points) {
        const stateKey = this.pointStateKey(assetKey, point.pointKey, point.objectIdentifier);
        this.pointStates.set(stateKey, {
          assetKey,
          pointKey: point.pointKey,
          objectIdentifier: point.objectIdentifier,
          objectName: point.objectName,
          canonicalPointType: point.canonicalPointType,
          unit: point.unit,
          qualityFlag: point.qualityFlag ?? "ok",
          value: point.presentValue ?? this.defaultPointValue(point.canonicalPointType)
        });
      }
    }
  }

  private pointStateKey(assetKey: string, pointKey?: string, objectIdentifier?: string) {
    return `${assetKey}::${pointKey ?? objectIdentifier ?? "unknown"}`;
  }

  private defaultPointValue(pointType?: string) {
    switch (pointType) {
      case "schedule":
      case "occupancy_mode":
        return "occupied";
      case "manual_override":
        return "auto";
      case "fan_status":
        return "on";
      case "co2":
        return 760;
      case "temperature":
        return 70;
      default:
        return "auto";
    }
  }

  private updateAnalogPointValues() {
    this.telemetryCycle += 1;
    const occupied = Array.from(this.pointStates.values()).some(
      (point) =>
        (point.canonicalPointType === "schedule" || point.canonicalPointType === "occupancy_mode") &&
        String(point.value).toLowerCase() === "occupied"
    );
    const overrideActive = Array.from(this.pointStates.values()).some(
      (point) => point.canonicalPointType === "manual_override" && String(point.value).toLowerCase() !== "auto"
    );

    for (const point of this.pointStates.values()) {
      if (point.canonicalPointType === "co2") {
        const baseline = occupied ? 820 : 560;
        const swing = Math.round(Math.sin(this.telemetryCycle / 2) * 55);
        point.value = baseline + swing + (overrideActive ? 25 : 0);
      } else if (point.canonicalPointType === "temperature") {
        point.value = Number((70 + Math.sin(this.telemetryCycle / 3) * 2.5).toFixed(1));
      } else if (point.canonicalPointType === "fan_status") {
        point.value = occupied || overrideActive ? "on" : "off";
      }
    }
  }

  private applyLinkedPointState(pointType: string | undefined, nextValue: string) {
    if (pointType !== "schedule" && pointType !== "occupancy_mode" && pointType !== "manual_override") {
      return;
    }

    const normalized = nextValue.toLowerCase();
    for (const point of this.pointStates.values()) {
      if (point.canonicalPointType === "fan_status") {
        point.value = normalized === "occupied" || normalized === "on" || normalized === "override" ? "on" : "off";
      }
      if (point.canonicalPointType === "manual_override" && pointType !== "manual_override" && normalized === "unoccupied") {
        point.value = "auto";
      }
    }
  }
}
