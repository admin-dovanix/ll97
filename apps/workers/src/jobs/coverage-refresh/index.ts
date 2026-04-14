import { refreshCoverageForAllBuildings } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const coverageRefreshJob: JobDefinition = {
  name: "coverage-refresh",
  description: "Refresh LL97 pathway state from configured source data.",
  async run() {
    const result = refreshCoverageForAllBuildings(2026);
    console.log(`Coverage refreshed for ${result.buildingCount} building(s).`);
  }
};
