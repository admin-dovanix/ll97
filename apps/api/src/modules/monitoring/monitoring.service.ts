import {
  acknowledgeGatewayCommandDispatch as acknowledgeGatewayCommandDispatchRecord,
  completeGatewayPollCycle as completeGatewayPollCycleRecord,
  getBacnetGatewayById,
  heartbeatGatewayRuntime as heartbeatGatewayRuntimeRecord,
  ingestBacnetGatewayDiscoverySnapshot as ingestBacnetGatewayDiscoverySnapshotRecord,
  ingestBacnetGatewayTelemetry as ingestBacnetGatewayTelemetryRecord,
  getMonitoringIssuesByBuildingId,
  ingestSensorReading as ingestSensorReadingRecord,
  listBacnetGatewaysByBuildingId,
  listPendingGatewayCommandDispatches as listPendingGatewayCommandDispatchesRecord,
  processPendingGatewayCommandDispatches as processPendingGatewayCommandDispatchesRecord,
  refreshGatewayRuntimeHealth as refreshGatewayRuntimeHealthRecord,
  registerBacnetGateway as registerBacnetGatewayRecord,
  startGatewayPollCycle as startGatewayPollCycleRecord,
  startDiscoveryRun as startDiscoveryRunRecord
} from "@airwise/database";
import type { MonitoringIssue } from "@airwise/domain";

export function ingestSensorReading(payload: Record<string, unknown>) {
  return ingestSensorReadingRecord(payload);
}

export function startDiscoveryRun(buildingId: string) {
  return startDiscoveryRunRecord(buildingId);
}

export function listBacnetGateways(buildingId: string) {
  return listBacnetGatewaysByBuildingId(buildingId);
}

export function getBacnetGateway(gatewayId: string) {
  return getBacnetGatewayById(gatewayId);
}

export function registerBacnetGateway(input: {
  buildingId: string;
  name: string;
  protocol?: string;
  vendor?: string;
  host?: string;
  port?: number;
  authType?: string;
  runtimeMode?: string;
  commandEndpoint?: string;
  pollIntervalSeconds?: number;
  metadataJson?: string;
}) {
  return registerBacnetGatewayRecord(input);
}

export function heartbeatGatewayRuntime(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  agentVersion?: string;
  status?: string;
  queueDepth?: number;
  telemetryLagSeconds?: number;
  metadata?: Record<string, unknown>;
}) {
  return heartbeatGatewayRuntimeRecord(input);
}

export function startGatewayPollCycle(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  reason?: string;
  includeCommands?: boolean;
}) {
  return startGatewayPollCycleRecord(input);
}

export function completeGatewayPollCycle(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  telemetryAcceptedCount?: number;
  telemetryIgnoredCount?: number;
  discoveryAssetCount?: number;
  notes?: string;
}) {
  return completeGatewayPollCycleRecord(input);
}

export function ingestBacnetGatewayDiscoverySnapshot(input: {
  buildingId: string;
  gatewayId?: string;
  gateway?: {
    name?: string;
    protocol?: string;
    vendor?: string;
    host?: string;
    port?: number;
    authType?: string;
    metadataJson?: string;
  };
  observedAt?: string;
  assets: Array<{
    assetKey?: string;
    systemName: string;
    assetType?: string;
    protocol?: string;
    vendor?: string;
    location?: string;
    status?: string;
    metadata?: Record<string, unknown>;
    points: Array<{
      pointKey?: string;
      objectIdentifier: string;
      objectName: string;
      canonicalPointType?: string;
      unit?: string;
      isWritable?: boolean;
      isWhitelisted?: boolean;
      safetyCategory?: string;
      presentValue?: string | number;
      qualityFlag?: string;
      metadata?: Record<string, unknown>;
    }>;
  }>;
}) {
  return ingestBacnetGatewayDiscoverySnapshotRecord(input);
}

export function ingestBacnetGatewayTelemetry(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  events: Array<{
    assetKey?: string;
    pointKey?: string;
    objectIdentifier?: string;
    value: string | number;
    unit?: string;
    qualityFlag?: string;
  }>;
}) {
  return ingestBacnetGatewayTelemetryRecord(input);
}

export function listPendingGatewayCommandDispatches(input: { gatewayId: string; token: string }) {
  return listPendingGatewayCommandDispatchesRecord(input);
}

export function acknowledgeGatewayCommandDispatch(input: {
  gatewayId: string;
  token: string;
  dispatchId: string;
  success: boolean;
  responseJson?: string;
  errorMessage?: string;
  appliedValue?: string;
}) {
  return acknowledgeGatewayCommandDispatchRecord(input);
}

export function processPendingGatewayCommandDispatches(gatewayId?: string) {
  return processPendingGatewayCommandDispatchesRecord(gatewayId);
}

export function refreshGatewayRuntimeHealth(referenceTime?: string) {
  return refreshGatewayRuntimeHealthRecord(referenceTime);
}

export function getMonitoringIssues(buildingId: string) {
  return getMonitoringIssuesByBuildingId(buildingId);
}
