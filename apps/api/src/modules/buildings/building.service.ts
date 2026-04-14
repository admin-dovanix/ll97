import { getBuildingById as getBuildingRecordById } from "@airwise/database";
import type { Building } from "@airwise/domain";

export function getBuildingById(id: string): Building {
  return getBuildingRecordById(id);
}
