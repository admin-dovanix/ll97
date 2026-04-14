import { evaluateMonitoringRulesForAllBuildings } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const issueDetectionJob: JobDefinition = {
  name: "issue-detection",
  description: "Evaluate ventilation telemetry and emit deterministic issues.",
  async run() {
    const result = evaluateMonitoringRulesForAllBuildings();
    console.log(`Issue detection evaluated ${result.buildingCount} building(s).`);
  }
};
