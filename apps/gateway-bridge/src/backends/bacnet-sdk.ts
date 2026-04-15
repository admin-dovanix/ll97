import { pathToFileURL } from "node:url";
import type { BridgeCommandInput, BridgeCommandResult, BridgeSnapshot, BridgeTelemetryEvent } from "../types.js";
import type { BacnetSdkProvider, BridgeBackend, BridgeBackendConfig } from "./types.js";

type ProviderFactory = (config: Record<string, unknown>) => Promise<BacnetSdkProvider> | BacnetSdkProvider;

function isProvider(value: unknown): value is BacnetSdkProvider {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as BacnetSdkProvider).getDiscoverySnapshot === "function" &&
    typeof (value as BacnetSdkProvider).getTelemetryEvents === "function" &&
    typeof (value as BacnetSdkProvider).applyCommand === "function"
  );
}

export class BacnetSdkBridgeBackend implements BridgeBackend {
  readonly type = "bacnet-sdk";
  private readonly provider: BacnetSdkProvider;
  private readonly modulePath: string;
  private readonly exportName: string;

  private constructor(provider: BacnetSdkProvider, modulePath: string, exportName: string) {
    this.provider = provider;
    this.modulePath = modulePath;
    this.exportName = exportName;
  }

  static async create(config: BridgeBackendConfig) {
    const modulePath = config.sdkModulePath?.trim();
    if (!modulePath) {
      throw new Error("AIRWISE_GATEWAY_BRIDGE_SDK_MODULE_PATH is required for the bacnet-sdk backend.");
    }

    const exportName = config.sdkExportName?.trim() || "createBacnetSdkProvider";
    const moduleUrl = modulePath.startsWith("file:") ? modulePath : pathToFileURL(modulePath).href;
    const imported = (await import(moduleUrl)) as Record<string, unknown>;
    const candidate = imported[exportName] ?? imported.default;

    const sdkConfig = config.sdkConfigJson ? (JSON.parse(config.sdkConfigJson) as Record<string, unknown>) : {};

    let provider: BacnetSdkProvider | null = null;
    if (typeof candidate === "function") {
      const created = await (candidate as ProviderFactory)(sdkConfig);
      if (isProvider(created)) {
        provider = created;
      }
    } else if (isProvider(candidate)) {
      provider = candidate;
    }

    if (!provider) {
      throw new Error(
        `SDK module ${modulePath} did not export a valid BACnet SDK provider at "${exportName}" or default export.`
      );
    }

    return new BacnetSdkBridgeBackend(provider, modulePath, exportName);
  }

  getMetadata() {
    return {
      backendType: this.type,
      sdkModulePath: this.modulePath,
      sdkExportName: this.exportName,
      ...(this.provider.getMetadata?.() ?? {})
    };
  }

  async getDiscoverySnapshot(): Promise<BridgeSnapshot> {
    return this.provider.getDiscoverySnapshot();
  }

  async getTelemetryEvents(): Promise<BridgeTelemetryEvent[]> {
    return this.provider.getTelemetryEvents();
  }

  async applyCommand(input: BridgeCommandInput): Promise<BridgeCommandResult> {
    return this.provider.applyCommand(input);
  }
}
