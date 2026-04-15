import { pointKey, readSnapshotFile } from "../lib/shared.js";
import type { BridgeCommandInput, BridgeCommandResult, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";
import type { BridgeBackend, BridgeBackendConfig } from "./types.js";

type Overlay = {
  value: string | number;
  updatedAt: string;
};

export class FileFeedBridgeBackend implements BridgeBackend {
  readonly type = "file-feed";
  private readonly discoveryFile?: string;
  private readonly telemetryFile?: string;
  private readonly overlays = new Map<string, Overlay>();

  constructor(config: BridgeBackendConfig) {
    this.discoveryFile = config.discoveryFile;
    this.telemetryFile = config.telemetryFile ?? config.discoveryFile;
  }

  getMetadata() {
    return {
      backendType: this.type,
      discoverySource: this.discoveryFile ?? "built-in sample snapshot",
      telemetrySource: this.telemetryFile ?? this.discoveryFile ?? "built-in sample snapshot",
      overlayCount: this.overlays.size
    };
  }

  async getDiscoverySnapshot() {
    return this.withOverlays(readSnapshotFile(this.discoveryFile));
  }

  async getTelemetryEvents() {
    const snapshot = this.withOverlays(readSnapshotFile(this.telemetryFile));

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
          }) satisfies BridgeTelemetryEvent
      )
    );
  }

  async applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult> {
    const snapshot = readSnapshotFile(this.discoveryFile);
    const matched = snapshot.assets.flatMap((asset) =>
      asset.points.map((point) => ({
        assetKey: asset.assetKey,
        pointKey: point.pointKey,
        objectIdentifier: point.objectIdentifier
      }))
    ).find((candidate) => {
      return (
        pointKey(candidate.assetKey, candidate.pointKey, candidate.objectIdentifier) ===
        pointKey(input.command.assetKey, input.command.pointKey, input.command.objectIdentifier)
      );
    });

    if (!matched || typeof input.command.requestedValue !== "string") {
      return {
        success: false,
        errorMessage: "Point not found in file-feed bridge state."
      };
    }

    this.overlays.set(pointKey(matched.assetKey, matched.pointKey, matched.objectIdentifier), {
      value: input.command.requestedValue,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      appliedValue: input.command.requestedValue,
      responseJson: JSON.stringify({
        bridge: "file-feed",
        dispatchId: input.dispatchId
      })
    };
  }

  private withOverlays(snapshot: BridgeSnapshot) {
    return {
      ...snapshot,
      observedAt: new Date().toISOString(),
      assets: snapshot.assets.map((asset) => ({
        ...asset,
        points: asset.points.map((point) => {
          const overlay = this.overlays.get(pointKey(asset.assetKey, point.pointKey, point.objectIdentifier));
          if (!overlay) {
            return point;
          }

          return {
            ...point,
            presentValue: overlay.value,
            qualityFlag: point.qualityFlag ?? "ok"
          };
        })
      }))
    } satisfies BridgeSnapshot;
  }
}
