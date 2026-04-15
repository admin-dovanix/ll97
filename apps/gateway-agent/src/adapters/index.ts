import { BacnetBridgeGatewayAdapter } from "./bacnet-bridge.js";
import { SimulatedGatewayAdapter } from "./simulated.js";
import { SnapshotFileGatewayAdapter } from "./snapshot-file.js";
import type { GatewayAdapter, GatewayAdapterConfig } from "./types.js";

export type GatewayAdapterType = "simulated" | "snapshot-file" | "bacnet-bridge";

export function createGatewayAdapter(type: GatewayAdapterType, config: GatewayAdapterConfig): GatewayAdapter {
  switch (type) {
    case "bacnet-bridge":
      return new BacnetBridgeGatewayAdapter(config);
    case "snapshot-file":
      return new SnapshotFileGatewayAdapter(config);
    case "simulated":
    default:
      return new SimulatedGatewayAdapter(config);
  }
}
