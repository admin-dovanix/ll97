import { normalizeTelemetryEvents } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const telemetryNormalizationJob: JobDefinition = {
  name: "telemetry-normalization",
  description: "Normalize raw sensor and BAS events into canonical telemetry.",
  async run() {
    const result = normalizeTelemetryEvents();
    console.log(`Normalized ${result.normalizedCount} telemetry event(s).`);
  }
};
