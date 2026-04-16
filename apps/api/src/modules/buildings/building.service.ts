import { getBuildingById as getBuildingRecordById, updateBuildingBasProfile as updateBuildingBasProfileRecord } from "@airwise/database";
import type { Building } from "@airwise/domain";

export function getBuildingById(id: string): Building {
  return getBuildingRecordById(id);
}

export function updateBuildingBasProfile(
  input: Parameters<typeof updateBuildingBasProfileRecord>[0]
): Building {
  return updateBuildingBasProfileRecord(input);
}
