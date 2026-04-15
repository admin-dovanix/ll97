import { BacnetSdkBridgeBackend } from "./bacnet-sdk.js";
import { FileFeedBridgeBackend } from "./file-feed.js";
import { SimulatedBridgeBackend } from "./simulated.js";
import type { BridgeBackend, BridgeBackendConfig } from "./types.js";

export type BridgeBackendType = "simulated" | "file-feed" | "bacnet-sdk";

export async function createBridgeBackend(type: BridgeBackendType, config: BridgeBackendConfig): Promise<BridgeBackend> {
  switch (type) {
    case "bacnet-sdk":
      return BacnetSdkBridgeBackend.create(config);
    case "file-feed":
      return new FileFeedBridgeBackend(config);
    case "simulated":
    default:
      return new SimulatedBridgeBackend(config);
  }
}
