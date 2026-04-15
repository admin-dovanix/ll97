export type GatewayPointSnapshot = {
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
};

export type GatewayAssetSnapshot = {
  assetKey?: string;
  systemName: string;
  assetType?: string;
  protocol?: string;
  vendor?: string;
  location?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  points: GatewayPointSnapshot[];
};

export type GatewaySnapshotPayload = {
  observedAt?: string;
  assets: GatewayAssetSnapshot[];
};

export type GatewayRuntimeResponse = {
  gatewayId: string;
  buildingId: string;
  name: string;
  runtimeMode?: string;
  commandEndpoint?: string;
  protocol?: string;
  heartbeatStatus?: string;
  pollIntervalSeconds?: number;
  lastHeartbeatAt?: string;
  lastPollRequestedAt?: string;
  lastPollCompletedAt?: string;
  nextPollDueAt?: string;
  agentVersion?: string;
};

export type GatewayDispatchRecord = {
  id: string;
  gatewayId: string;
  commandId: string;
  buildingId: string;
  pointId: string;
  status: string;
  payloadJson: string;
  responseJson?: string;
  errorMessage?: string;
  createdAt: string;
  dispatchedAt?: string;
  acknowledgedAt?: string;
  deliveryAttemptCount: number;
  lastDeliveryAttemptAt?: string;
};

export type GatewayPollResponse = GatewayRuntimeResponse & {
  observedAt: string;
  commands: GatewayDispatchRecord[];
  shouldPollTelemetry: boolean;
  shouldPollDiscovery: boolean;
  pendingDispatchCount: number;
};

export type GatewayTelemetryEvent = {
  assetKey?: string;
  pointKey?: string;
  objectIdentifier?: string;
  value: string | number;
  unit?: string;
  qualityFlag?: string;
};

export type GatewayCommandPayload = {
  assetKey?: string | null;
  pointKey?: string | null;
  objectIdentifier?: string;
  requestedValue?: string;
};
