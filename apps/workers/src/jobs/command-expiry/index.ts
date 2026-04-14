import { expireControlCommands } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const commandExpiryJob: JobDefinition = {
  name: "command-expiry",
  description: "Expire temporary overrides and trigger rollback logic.",
  async run() {
    const result = expireControlCommands();
    console.log(`Expired ${result.expiredCount} command(s).`);
  }
};
