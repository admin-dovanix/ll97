import {
  attachDocumentEvidence,
  autoMatchPublicBuildingRecord,
  createRecommendationAction,
  generateComplianceRequirements,
  getAppWorkspace,
  getMonitoringWorkspaceByBuildingId,
  getPublicSourceWorkspaceByBuildingId,
  ingestSensorReading,
  createControlCommand,
  createDocument,
  createPortfolio,
  importPublicBuildingRecords,
  getBuildingById,
  getComplianceSummaryByBuildingId,
  getDocumentWorkspaceByBuildingId,
  getPortfolioWorkspace,
  importBuildings,
  listBasPointsByBuildingId,
  listControlCommands,
  listPortfolios,
  resolveCoverageRecord,
  startDiscoveryRun,
  updateRecommendationActionStatus,
  updateBasPointMapping
} from "@airwise/database";

export async function getAppShellWorkspace() {
  return getAppWorkspace();
}

export async function listPortfolioWorkspaces() {
  return listPortfolios().map((portfolio) => getPortfolioWorkspace(portfolio.id));
}

export async function getBuildingWorkspace(buildingId: string) {
  return getBuildingById(buildingId);
}

export async function getBuildingComplianceWorkspace(buildingId: string) {
  return getComplianceSummaryByBuildingId(buildingId);
}

export async function getBuildingMonitoringWorkspace(buildingId: string) {
  return getMonitoringWorkspaceByBuildingId(buildingId);
}

export async function getBuildingDocumentsWorkspace(buildingId: string) {
  return getDocumentWorkspaceByBuildingId(buildingId);
}

export async function getBuildingPublicSourceWorkspace(buildingId: string) {
  return getPublicSourceWorkspaceByBuildingId(buildingId);
}

export async function listCommandWorkspace() {
  const portfolios = await listPortfolioWorkspaces();
  const buildings = portfolios.flatMap((portfolio) => portfolio.buildings);

  return {
    commands: listControlCommands(),
    buildings,
    pointsByBuilding: Object.fromEntries(
      buildings.map((building) => [building.id, listBasPointsByBuildingId(building.id)])
    )
  };
}

export {
  attachDocumentEvidence,
  autoMatchPublicBuildingRecord,
  createControlCommand,
  createDocument,
  createPortfolio,
  createRecommendationAction,
  generateComplianceRequirements,
  ingestSensorReading,
  importBuildings,
  importPublicBuildingRecords,
  resolveCoverageRecord,
  startDiscoveryRun,
  updateRecommendationActionStatus,
  updateBasPointMapping
};
