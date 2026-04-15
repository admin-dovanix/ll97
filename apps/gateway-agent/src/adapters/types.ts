import type { GatewayDispatchRecord, GatewaySnapshotPayload, GatewayTelemetryEvent } from "../types.js";

export type GatewayAdapterConfig = {
  discoveryFile?: string;
  telemetryFile?: string;
  bridgeBaseUrl?: string;
  bridgeApiKey?: string;
  bridgeApiKeyHeader?: string;
  bridgeDiscoveryPath?: string;
  bridgeTelemetryPath?: string;
  bridgeCommandPath?: string;
};

export type GatewayAdapterMetadata = {
  adapterType: string;
  trackedPointCount?: number;
  discoverySource?: string;
  telemetrySource?: string;
};

export type GatewayCommandResult =
  | {
      success: true;
      appliedValue?: string;
      responseJson?: string;
    }
  | {
      success: false;
      errorMessage: string;
      responseJson?: string;
    };

export interface GatewayAdapter {
  readonly type: string;
  getMetadata(): GatewayAdapterMetadata;
  getDiscoverySnapshot(): Promise<GatewaySnapshotPayload>;
  collectTelemetry(): Promise<GatewayTelemetryEvent[]>;
  applyCommand(dispatch: GatewayDispatchRecord): Promise<GatewayCommandResult>;
}
