import { startDiscoveryForAllBuildings } from "@airwise/database";
import type { JobDefinition } from "../../lib/job-runner.js";

export const bacnetDiscoveryJob: JobDefinition = {
  name: "bacnet-discovery",
  description: "Discover BAS devices and candidate writable points.",
  async run() {
    const result = startDiscoveryForAllBuildings();
    console.log(`Discovery executed for ${result.buildingCount} building(s).`);
  }
};
