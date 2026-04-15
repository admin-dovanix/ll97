import { parseCommandPayload, readDiscoverySnapshot } from "../lib/shared.js";
import type { GatewayDispatchRecord, GatewaySnapshotPayload, GatewayTelemetryEvent } from "../types.js";
import type { GatewayAdapter, GatewayAdapterConfig, GatewayCommandResult } from "./types.js";

type PointOverlay = {
  value: string | number;
  updatedAt: string;
};

export class SnapshotFileGatewayAdapter implements GatewayAdapter {
  readonly type = "snapshot-file";
  private readonly discoveryFile?: string;
  private readonly telemetryFile?: string;
  private readonly overrides = new Map<string, PointOverlay>();

  constructor(config: GatewayAdapterConfig) {
    this.discoveryFile = config.discoveryFile;
    this.telemetryFile = config.telemetryFile ?? config.discoveryFile;
  }

  getMetadata() {
    return {
      adapterType: this.type,
      discoverySource: this.discoveryFile ?? "built-in sample snapshot",
      telemetrySource: this.telemetryFile ?? this.discoveryFile ?? "built-in sample snapshot"
    };
  }

  async getDiscoverySnapshot() {
    return this.withOverrides(readDiscoverySnapshot(this.discoveryFile));
  }

  async collectTelemetry() {
    const snapshot = this.withOverrides(readDiscoverySnapshot(this.telemetryFile));
    return snapshot.assets.flatMap((asset) =>
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

  async applyCommand(dispatch: GatewayDispatchRecord): Promise<GatewayCommandResult> {
    const payload = parseCommandPayload(dispatch.payloadJson);
    const snapshot = readDiscoverySnapshot(this.discoveryFile);
    const match = snapshot.assets.flatMap((asset) =>
      asset.points.map((point) => ({
        assetKey: asset.assetKey ?? asset.systemName.toLowerCase().replace(/\s+/g, "_"),
        point
      }))
    ).find(({ assetKey, point }) => {
      return (
        (payload.assetKey ? assetKey === payload.assetKey : true) &&
        (payload.pointKey ? point.pointKey === payload.pointKey : true) &&
        (payload.objectIdentifier ? point.objectIdentifier === payload.objectIdentifier : true)
      );
    });

    if (!match || typeof payload.requestedValue !== "string") {
      return {
        success: false,
        errorMessage: "Point not found in snapshot file adapter."
      };
    }

    const overlayKey = this.overlayKey(match.assetKey, match.point.pointKey, match.point.objectIdentifier);
    this.overrides.set(overlayKey, {
      value: payload.requestedValue,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      appliedValue: payload.requestedValue,
      responseJson: JSON.stringify({
        adapterType: this.type,
        overlayKey
      })
    };
  }

  private withOverrides(snapshot: GatewaySnapshotPayload) {
    return {
      ...snapshot,
      assets: snapshot.assets.map((asset) => {
        const assetKey = asset.assetKey ?? asset.systemName.toLowerCase().replace(/\s+/g, "_");

        return {
          ...asset,
          assetKey,
          points: asset.points.map((point) => {
            const overlay = this.overrides.get(this.overlayKey(assetKey, point.pointKey, point.objectIdentifier));
            if (!overlay) {
              return point;
            }

            return {
              ...point,
              presentValue: overlay.value,
              metadata: {
                ...(point.metadata ?? {}),
                overriddenByAgentAt: overlay.updatedAt
              }
            };
          })
        };
      })
    } satisfies GatewaySnapshotPayload;
  }

  private overlayKey(assetKey: string, pointKey?: string, objectIdentifier?: string) {
    return `${assetKey}::${pointKey ?? objectIdentifier ?? "unknown"}`;
  }
}
