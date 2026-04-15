import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BridgeSnapshot } from "../types.js";

export const sampleSnapshot: BridgeSnapshot = {
  observedAt: new Date().toISOString(),
  assets: [
    {
      assetKey: "corridor_ahu",
      systemName: "Corridor AHU",
      assetType: "ahu",
      protocol: "BACnet/IP",
      vendor: "Reference Bridge",
      location: "Roof",
      status: "active",
      points: [
        {
          assetKey: "corridor_ahu",
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
          assetKey: "corridor_ahu",
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
          assetKey: "corridor_ahu",
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
          assetKey: "corridor_ahu",
          pointKey: "corridor_fan_status",
          objectIdentifier: "binary-input,5",
          objectName: "Corridor Fan Status",
          canonicalPointType: "fan_status",
          unit: "binary",
          presentValue: "on"
        },
        {
          assetKey: "corridor_ahu",
          pointKey: "corridor_co2",
          objectIdentifier: "analog-input,18",
          objectName: "Corridor CO2",
          canonicalPointType: "co2",
          unit: "ppm",
          presentValue: 760
        },
        {
          assetKey: "corridor_ahu",
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

export function normalizeSourceKey(value?: string | null) {
  return value?.trim().replace(/\s+/g, "_").toUpperCase();
}

export function pointKey(assetKey?: string | null, pointKeyValue?: string | null, objectIdentifier?: string) {
  return `${normalizeSourceKey(assetKey) ?? "unknown"}::${normalizeSourceKey(pointKeyValue) ?? objectIdentifier ?? "unknown"}`;
}

export function readSnapshotFile(filePath?: string) {
  if (!filePath) {
    return structuredClone(sampleSnapshot);
  }

  const raw = readFileSync(resolve(filePath), "utf8");
  const parsed = JSON.parse(raw) as BridgeSnapshot;

  if (!Array.isArray(parsed.assets) || parsed.assets.length === 0) {
    throw new Error(`Bridge snapshot ${filePath} must contain a non-empty assets array.`);
  }

  return parsed;
}
