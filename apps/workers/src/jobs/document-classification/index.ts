import type { JobDefinition } from "../../lib/job-runner.js";

export const documentClassificationJob: JobDefinition = {
  name: "document-classification",
  description: "Classify uploaded compliance and engineering documents.",
  async run() {
    console.log("Document classification placeholder executed.");
  }
};
