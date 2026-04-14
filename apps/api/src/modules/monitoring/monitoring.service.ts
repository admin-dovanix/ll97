import {
  getMonitoringIssuesByBuildingId,
  ingestSensorReading as ingestSensorReadingRecord,
  startDiscoveryRun as startDiscoveryRunRecord
} from "@airwise/database";
import type { MonitoringIssue } from "@airwise/domain";

export function ingestSensorReading(payload: Record<string, unknown>) {
  return ingestSensorReadingRecord(payload);
}

export function startDiscoveryRun(buildingId: string) {
  return startDiscoveryRunRecord(buildingId);
}

export function getMonitoringIssues(buildingId: string) {
  return getMonitoringIssuesByBuildingId(buildingId);
}
