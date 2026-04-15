import type { BridgeCommandInput, BridgeCommandResult, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";

export type BridgeBackendConfig = {
  discoveryFile?: string;
  telemetryFile?: string;
  sdkModulePath?: string;
  sdkExportName?: string;
  sdkConfigJson?: string;
};

export interface BridgeBackend {
  readonly type: string;
  getDiscoverySnapshot(): Promise<BridgeSnapshot>;
  getTelemetryEvents(): Promise<BridgeTelemetryEvent[]>;
  applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult>;
  getMetadata(): Record<string, unknown>;
}

export interface BacnetSdkProvider {
  getDiscoverySnapshot(): Promise<BridgeSnapshot>;
  getTelemetryEvents(): Promise<BridgeTelemetryEvent[]>;
  applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult>;
  getMetadata?(): Record<string, unknown>;
}
