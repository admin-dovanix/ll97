import { processPendingGatewayCommandDispatches } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const gatewayCommandDispatchJob: JobDefinition = {
  name: "gateway-command-dispatch",
  description: "Deliver pending gateway command dispatches or process loopback runtimes.",
  async run() {
    const result = processPendingGatewayCommandDispatches();
    console.log(
      `Processed ${result.processedCount} gateway command dispatch(es). Re-queued ${result.requeuedCount}, dead-lettered ${result.deadLetterCount}.`
    );
  }
};
