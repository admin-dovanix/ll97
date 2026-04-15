import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { RecommendationsWorkspace } from "../../../../components/recommendations/recommendations-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { getBuildingMonitoringWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, monitoring] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingMonitoringWorkspace(id).catch(() => null)
  ]);

  if (!building || !monitoring) {
    notFound();
  }
  const { issues, recommendationActions } = monitoring;
  const recommendationRows = issues.map((issue) => ({
    id: issue.id,
    recommendation: issue.issueType.replaceAll("_", " "),
    status: issue.status ?? "open",
    confidence: issue.confidenceScore,
    system: issue.systemId ?? "Building scope",
    evidenceWindow: issue.evidenceWindow,
    assignee: issue.assignedTo ?? "Unassigned",
    executionPath: issue.writebackEligible ? "Operator review -> command workflow" : "Operator review",
    actionLabel: issue.writebackEligible ? "Prepare operator action" : "Create operator review",
    summary: issue.summary,
    recommendedAction: issue.recommendedAction ?? "Collect operator review",
    writebackEligible: issue.writebackEligible
  }));

  return (
    <AppShell
      buildingSection="recommendations"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          description="Operator recommendations are grounded in telemetry issues and action history, not a separate speculative model."
          eyebrow="Recommendations"
          status={<StatusBadge label={`${recommendationRows.length} recommendations`} tone="accent" />}
          title={`Recommendations for ${building.name}`}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Open recommendations", value: recommendationRows.length.toString(), emphasize: true },
            { label: "Action ledger", value: recommendationActions.length.toString() },
            {
              label: "Writeback eligible",
              value: recommendationRows.filter((row) => row.writebackEligible).length.toString()
            },
            {
              label: "Completed actions",
              value: recommendationActions.filter((action) => action.actionStatus === "completed").length.toString()
            }
          ]}
        />
      }
    >
      <RecommendationsWorkspace
        actions={recommendationActions.map((action) => ({
          id: action.id,
          recommendationId: action.recommendationId,
          actionType: action.actionType,
          actionStatus: action.actionStatus,
          assignee: action.assignee,
          notes: action.notes,
          createdAt: action.createdAt,
          completedAt: action.completedAt,
          beforeAfter: action.beforeAfter
            ? {
                metricLabel: action.beforeAfter.metricLabel,
                baselineValue: action.beforeAfter.baselineValue,
                comparisonValue: action.beforeAfter.comparisonValue,
                delta: action.beforeAfter.delta
              }
            : null
        }))}
        buildingId={building.id}
        recommendations={recommendationRows}
      />
    </AppShell>
  );
}
