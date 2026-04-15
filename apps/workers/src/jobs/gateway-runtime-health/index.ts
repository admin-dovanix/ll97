import { refreshGatewayRuntimeHealth } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const gatewayRuntimeHealthJob: JobDefinition = {
  name: "gateway-runtime-health",
  description: "Refresh gateway heartbeat health and flag stale runtimes.",
  async run() {
    const result = refreshGatewayRuntimeHealth();
    console.log(`Gateway runtime health refreshed. Online ${result.onlineCount}, stale ${result.staleCount}.`);
  }
};
