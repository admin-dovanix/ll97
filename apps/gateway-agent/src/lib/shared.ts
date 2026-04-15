import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { GatewayCommandPayload, GatewaySnapshotPayload } from "../types.js";

export const sampleSnapshot: GatewaySnapshotPayload = {
  assets: [
    {
      assetKey: "corridor_ahu",
      systemName: "Corridor AHU",
      assetType: "ahu",
      protocol: "BACnet/IP",
      vendor: "Local Gateway Agent",
      location: "Roof",
      status: "active",
      points: [
        {
          pointKey: "corridor_schedule",
          objectIdentifier: "schedule,11",
          objectName: "Corridor AHU Schedule",
          canonicalPointType: "schedule",
          unit: "enum",
          isWritable: true,
          isWhitelisted: true,
          presentValue: "occupied"
        },
        {
          pointKey: "corridor_occupancy_mode",
          objectIdentifier: "multi-state-value,9",
          objectName: "Corridor Occupancy Mode",
          canonicalPointType: "occupancy_mode",
          unit: "enum",
          isWritable: true,
          isWhitelisted: true,
          presentValue: "occupied"
        },
        {
          pointKey: "corridor_manual_override",
          objectIdentifier: "binary-value,14",
          objectName: "Corridor Manual Override",
          canonicalPointType: "manual_override",
          unit: "binary",
          isWritable: true,
          isWhitelisted: true,
          presentValue: "auto"
        },
        {
          pointKey: "corridor_fan_status",
          objectIdentifier: "binary-input,5",
          objectName: "Corridor Fan Status",
          canonicalPointType: "fan_status",
          unit: "binary",
          presentValue: "on"
        },
        {
          pointKey: "corridor_co2",
          objectIdentifier: "analog-input,18",
          objectName: "Corridor CO2",
          canonicalPointType: "co2",
          unit: "ppm",
          presentValue: 760
        },
        {
          pointKey: "corridor_temperature",
          objectIdentifier: "analog-input,19",
          objectName: "Corridor Temperature",
          canonicalPointType: "temperature",
          unit: "F",
          presentValue: 70
        }
      ]
    }
  ]
};

export function delay(ms: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function nextDelayMs(nextPollDueAt: string | undefined, fallbackMs: number) {
  if (!nextPollDueAt) {
    return fallbackMs;
  }

  return Math.max(1_000, Date.parse(nextPollDueAt) - Date.now());
}

export function readDiscoverySnapshot(filePath?: string) {
  if (!filePath) {
    return sampleSnapshot;
  }

  const raw = readFileSync(resolve(filePath), "utf8");
  const parsed = JSON.parse(raw) as { observedAt?: string; assets?: GatewaySnapshotPayload["assets"] } | GatewaySnapshotPayload;

  if (!("assets" in parsed) || !Array.isArray(parsed.assets) || parsed.assets.length === 0) {
    throw new Error(`Discovery snapshot ${filePath} must contain a non-empty assets array.`);
  }

  return {
    observedAt: parsed.observedAt,
    assets: parsed.assets
  } satisfies GatewaySnapshotPayload;
}

export function parseCommandPayload(payloadJson: string) {
  return JSON.parse(payloadJson) as GatewayCommandPayload;
}
