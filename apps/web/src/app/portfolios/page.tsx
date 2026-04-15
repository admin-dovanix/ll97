import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { KPIStrip } from "../../components/data-display/kpi-strip";
import { PortfolioWorkspace } from "../../components/portfolios/portfolio-workspace";
import { StatusBadge } from "../../components/ui/status-badge";
import { requireAuthenticatedSession } from "../../lib/auth";
import {
  getBuildingComplianceWorkspace,
  getBuildingMonitoringWorkspace,
  listPortfolioWorkspaces
} from "../../lib/server-data";
import { buildingComplianceStatus } from "../../lib/status";
import { formatCurrency, formatPercent } from "../../lib/utils";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const session = await requireAuthenticatedSession();
  const portfolios = await listPortfolioWorkspaces();
  const buildings = portfolios.flatMap((portfolio) =>
    portfolio.buildings.map((building) => ({
      building,
      portfolio
    }))
  );
  const buildingSummaries = await Promise.all(
    buildings.map(async ({ building, portfolio }) => {
      const [compliance, monitoring] = await Promise.all([
        getBuildingComplianceWorkspace(building.id).catch(() => null),
        getBuildingMonitoringWorkspace(building.id).catch(() => null)
      ]);
      const penalty =
        (compliance?.estimatedLateReportPenalty ?? 0) + (compliance?.estimatedEmissionsOverLimitPenalty ?? 0);
      const status = buildingComplianceStatus({
        blockerCount: compliance?.blockerCount,
        evidenceGapCount: compliance?.evidenceGapCount,
        penalty
      });

      return {
        id: building.id,
        portfolioId: portfolio.id,
        buildingName: building.name,
        portfolioName: portfolio.name,
        address: `${building.addressLine1}, ${building.city}, ${building.state}`,
        status,
        pathway: building.pathway,
        article: building.article,
        emissionsSignal:
          (compliance?.estimatedEmissionsOverLimitPenalty ?? 0) > 0 ? "Above limit estimate" : "Within current estimate",
        penalty,
        openIssues: monitoring?.issues.filter((issue) => issue.status !== "resolved").length ?? 0,
        actionLabel:
          status === "non-compliant" ? "Open compliance" : monitoring?.issues.length ? "Review monitoring" : "Open building",
        blockerCount: compliance?.blockerCount ?? 0,
        evidenceGapCount: compliance?.evidenceGapCount ?? 0,
        topIssues: (monitoring?.issues ?? []).slice(0, 3).map((issue) => issue.summary),
        recommendedActions: Array.from(
          new Set((monitoring?.issues ?? []).map((issue) => issue.recommendedAction).filter(Boolean))
        ) as string[]
      };
    })
  );

  const totalPenalty = buildingSummaries.reduce((sum, building) => sum + building.penalty, 0);
  const nonCompliant = buildingSummaries.filter((building) => building.status === "non-compliant").length;
  const atRisk = buildingSummaries.filter((building) => building.status === "at-risk").length;
  const compliantCount = buildingSummaries.filter((building) => building.status === "compliant").length;
  const complianceRate = buildingSummaries.length ? (compliantCount / buildingSummaries.length) * 100 : 0;

  return (
    <AppShell
      currentPortfolioId={session.memberships.find((membership) => membership.id === session.activeMembershipId)?.portfolioId}
      header={
        <PageHeader
          description="Decision-first portfolio oversight for LL97 compliance, monitored HVAC risk, and supervised building operations."
          eyebrow="Portfolios"
          status={<StatusBadge label={`${portfolios.length} portfolios`} tone="accent" />}
          title="Portfolio dashboard"
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Total penalty exposure", value: formatCurrency(totalPenalty), emphasize: true },
            { label: "Buildings non-compliant", value: nonCompliant.toString() },
            { label: "Buildings at risk", value: atRisk.toString() },
            { label: "Compliance rate", value: formatPercent(complianceRate) }
          ]}
        />
      }
    >
      <PortfolioWorkspace
        canEdit={session.activeRole === "owner"}
        portfolios={portfolios.map((portfolio) => ({ id: portfolio.id, name: portfolio.name }))}
        rows={buildingSummaries}
      />
    </AppShell>
  );
}
