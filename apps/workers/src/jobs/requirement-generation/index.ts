import { generateRequirementsForAllBuildings } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const requirementGenerationJob: JobDefinition = {
  name: "requirement-generation",
  description: "Generate compliance requirements for the active reporting year.",
  async run() {
    const result = generateRequirementsForAllBuildings(2026);
    console.log(`Requirements generated for ${result.buildingCount} building(s).`);
  }
};
