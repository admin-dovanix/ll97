import {
  generateComplianceRequirements,
  getComplianceSummaryByBuildingId
} from "@airwise/database";
import type { BuildingComplianceSummary } from "@airwise/domain";

export function getComplianceSummary(buildingId: string): BuildingComplianceSummary {
  return getComplianceSummaryByBuildingId(buildingId);
}

export function generateRequirements(buildingId: string, reportingYear: number) {
  return generateComplianceRequirements(buildingId, reportingYear);
}
