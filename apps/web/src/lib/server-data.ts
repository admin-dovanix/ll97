import {
  getMonitoringWorkspaceByBuildingId,
  getPublicSourceWorkspaceByBuildingId,
  getBuildingById,
  getComplianceSummaryByBuildingId,
  getControlCommandById,
  getDocumentWorkspaceByBuildingId,
  getReportingWorkspaceByBuildingId,
  getPortfolioWorkspace,
  listReportingInputFieldDefinitions,
  listBacnetGatewaysByBuildingId,
  listBasPointsByBuildingId,
  listControlCommands,
  listGatewayCommandDispatchesByBuildingId,
  listPublicBuildingRecords,
  listPortfolios,
  listPublicImportRuns
} from "@airwise/database";
import {
  requireActiveRole,
  requireAuthenticatedSession,
  requireBuildingAccess
} from "./auth";

export async function getAppShellWorkspace() {
  const session = await requireAuthenticatedSession();
  const portfolioIds = Array.from(new Set(session.memberships.map((membership) => membership.portfolioId)));
  const portfolioWorkspaces = portfolioIds.map((portfolioId) => getPortfolioWorkspace(portfolioId));
  const buildings = portfolioWorkspaces.flatMap((portfolio) => portfolio.buildings);
  const buildingIds = new Set(buildings.map((building) => building.id));
  const commands = listControlCommands().filter((command) => buildingIds.has(command.buildingId));

  return {
    portfolioCount: portfolioWorkspaces.length,
    buildingCount: buildings.length,
    documentCount: portfolioWorkspaces.reduce((total, portfolio) => {
      return total + portfolio.buildings.reduce((buildingTotal, building) => {
        return buildingTotal + getDocumentWorkspaceByBuildingId(building.id).documents.length;
      }, 0);
    }, 0),
    commandCount: commands.length,
    pendingCommandCount: commands.filter((command) => command.status === "pending_approval").length,
    issueCount: portfolioWorkspaces.reduce((total, portfolio) => {
      return total + portfolio.buildings.reduce((buildingTotal, building) => {
        return buildingTotal + getMonitoringWorkspaceByBuildingId(building.id).issues.filter((issue) => issue.status === "open").length;
      }, 0);
    }, 0),
    firstPortfolioId: portfolioWorkspaces[0]?.id,
    firstBuildingId: buildings[0]?.id
  };
}

export async function listPortfolioWorkspaces() {
  const session = await requireAuthenticatedSession();
  const allowedPortfolioIds = new Set(session.memberships.map((membership) => membership.portfolioId));

  return listPortfolios()
    .filter((portfolio) => allowedPortfolioIds.has(portfolio.id))
    .map((portfolio) => getPortfolioWorkspace(portfolio.id));
}

export async function getBuildingWorkspace(buildingId: string) {
  await requireBuildingAccess(buildingId);
  return getBuildingById(buildingId);
}

export async function getBuildingComplianceWorkspace(buildingId: string) {
  await requireBuildingAccess(buildingId);
  return getComplianceSummaryByBuildingId(buildingId);
}

export async function getBuildingMonitoringWorkspace(buildingId: string) {
  await requireBuildingAccess(buildingId);
  return getMonitoringWorkspaceByBuildingId(buildingId);
}

export async function getBuildingDocumentsWorkspace(buildingId: string) {
  await requireBuildingAccess(buildingId);
  return getDocumentWorkspaceByBuildingId(buildingId);
}

export async function getBuildingReportingWorkspace(buildingId: string, reportingYear = 2026) {
  await requireBuildingAccess(buildingId);
  return getReportingWorkspaceByBuildingId(buildingId, reportingYear);
}

export async function getReportingFieldDefinitions() {
  await requireActiveRole(["owner", "rdp", "rcxa"]);
  return listReportingInputFieldDefinitions();
}

export async function getBuildingPublicSourceWorkspace(buildingId: string) {
  await requireBuildingAccess(buildingId);
  return getPublicSourceWorkspaceByBuildingId(buildingId);
}

export async function listCommandWorkspace() {
  await requireActiveRole(["owner", "operator"]);
  const session = await requireAuthenticatedSession();
  const allowedPortfolioIds = new Set(
    session.memberships
      .filter((membership) => membership.role === "owner" || membership.role === "operator")
      .map((membership) => membership.portfolioId)
  );
  const portfolios = listPortfolios()
    .filter((portfolio) => allowedPortfolioIds.has(portfolio.id))
    .map((portfolio) => getPortfolioWorkspace(portfolio.id));
  const buildings = portfolios.flatMap((portfolio) => portfolio.buildings);
  const buildingIds = new Set(buildings.map((building) => building.id));

  return {
    commands: listControlCommands().filter((command) => buildingIds.has(command.buildingId)),
    buildings,
    gatewaysByBuilding: Object.fromEntries(
      buildings.map((building) => [building.id, listBacnetGatewaysByBuildingId(building.id)])
    ),
    dispatchesByBuilding: Object.fromEntries(
      buildings.map((building) => [building.id, listGatewayCommandDispatchesByBuildingId(building.id)])
    ),
    pointsByBuilding: Object.fromEntries(
      buildings.map((building) => [building.id, listBasPointsByBuildingId(building.id)])
    )
  };
}

export async function listVisibleImportRuns(limit = 20) {
  await requireActiveRole(["owner"]);
  return listPublicImportRuns(limit);
}

export async function getImportReviewWorkspace(limit = 20) {
  await requireActiveRole(["owner"]);
  const runs = listPublicImportRuns(limit);
  const records = listPublicBuildingRecords();
  const datasetNames = Array.from(new Set([...runs.map((run) => run.datasetName), ...records.map((record) => record.datasetName)])).sort(
    (left, right) => left.localeCompare(right)
  );

  const datasets = datasetNames.map((datasetName) => {
    const datasetRuns = runs.filter((run) => run.datasetName === datasetName);
    const datasetRecords = records.filter((record) => record.datasetName === datasetName);
    const latestRun = datasetRuns[0];
    const latestSourceVersion = latestRun?.sourceVersion ?? datasetRecords[0]?.sourceVersion;
    const matchedIdentityCount = datasetRecords.filter((record) => record.bbl || record.bin).length;

    return {
      datasetName,
      latestSourceVersion,
      recordCount: datasetRecords.length,
      matchedIdentityCount,
      runCount: datasetRuns.length,
      lastRunAt: latestRun?.completedAt ?? latestRun?.startedAt,
      lastRunStatus: latestRun?.status ?? "unknown",
      insertedCount: datasetRuns.reduce((total, run) => total + run.insertedCount, 0),
      updatedCount: datasetRuns.reduce((total, run) => total + run.updatedCount, 0),
      skippedCount: datasetRuns.reduce((total, run) => total + run.skippedCount, 0)
    };
  });

  return {
    datasets,
    runs
  };
}

export async function getAuthorizedCommand(commandId: string) {
  const command = getControlCommandById(commandId);
  if (!command) {
    return null;
  }

  await requireBuildingAccess(command.buildingId);
  return command;
}
