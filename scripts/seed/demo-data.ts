import {
  getDatabase,
  getBuildingById,
  getComplianceSummaryByBuildingId,
  getMonitoringWorkspaceByBuildingId,
  getReportingWorkspaceByBuildingId,
  listAppUsers,
  listPortfolios
} from "../../packages/database/src/index.ts";

getDatabase();

const portfolios = listPortfolios();
const users = listAppUsers();
const demoBuildings = ["bld_001", "bld_002"].map((id) => {
  const building = getBuildingById(id);
  const compliance = getComplianceSummaryByBuildingId(id);
  const filing = getReportingWorkspaceByBuildingId(id, 2026);
  const monitoring = getMonitoringWorkspaceByBuildingId(id);

  return {
    building,
    compliance,
    filing,
    monitoring
  };
});

console.log("AirWise demo data is ready.");
console.log("");
console.log("Seeded users:");
for (const user of users) {
  console.log(`- ${user.name} <${user.email}>`);
}

console.log("");
console.log(`Portfolios: ${portfolios.length}`);
for (const entry of demoBuildings) {
  console.log(
    `- ${entry.building.name}: article ${entry.building.article} / ${entry.building.pathway}, ${entry.compliance.blockerCount} blockers, ${entry.filing.inputValues.length} filing inputs, ${entry.monitoring.issues.length} monitoring issues`
  );
}
