import type { JobDefinition } from "../../lib/job-runner.js";

export const buildingImportJob: JobDefinition = {
  name: "building-import",
  description: "Resolve owner roster rows into canonical building records.",
  async run() {
    console.log("Building import placeholder executed.");
  }
};
