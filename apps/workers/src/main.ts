import { defaultAppEnv } from "@airwise/config";
import { runJob } from "./lib/job-runner.js";
import { buildingImportJob } from "./jobs/building-import/index.js";
import { coverageRefreshJob } from "./jobs/coverage-refresh/index.js";
import { requirementGenerationJob } from "./jobs/requirement-generation/index.js";
import { documentClassificationJob } from "./jobs/document-classification/index.js";
import { telemetryNormalizationJob } from "./jobs/telemetry-normalization/index.js";
import { bacnetDiscoveryJob } from "./jobs/bacnet-discovery/index.js";
import { issueDetectionJob } from "./jobs/issue-detection/index.js";
import { commandExpiryJob } from "./jobs/command-expiry/index.js";
import { gatewayCommandDispatchJob } from "./jobs/gateway-command-dispatch/index.js";
import { gatewayRuntimeHealthJob } from "./jobs/gateway-runtime-health/index.js";

const jobs = [
  buildingImportJob,
  coverageRefreshJob,
  requirementGenerationJob,
  documentClassificationJob,
  telemetryNormalizationJob,
  bacnetDiscoveryJob,
  issueDetectionJob,
  commandExpiryJob,
  gatewayCommandDispatchJob,
  gatewayRuntimeHealthJob
];

const requestedJobName = process.argv[2];

console.log(`AirWise workers running in ${defaultAppEnv.environment}.`);

if (requestedJobName) {
  const job = jobs.find((candidate) => candidate.name === requestedJobName);

  if (!job) {
    console.error(`Unknown job: ${requestedJobName}`);
    process.exit(1);
  }

  await runJob(job);
} else {
  console.log("Available jobs:");
  jobs.forEach((job) => console.log(`- ${job.name}: ${job.description}`));
}
