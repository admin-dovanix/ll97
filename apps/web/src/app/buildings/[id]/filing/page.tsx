import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { ReportingWorkspace } from "../../../../components/reporting/reporting-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { WorkflowStoryCard } from "../../../../components/workflow-story-card";
import { createReportingCycleAction } from "../../../actions";
import {
  getBuildingMonitoringWorkspace,
  getBuildingReportingWorkspace,
  getBuildingWorkspace,
  getReportingFieldDefinitions
} from "../../../../lib/server-data";
import { getBuildingReadiness, getFilingReadinessSummary } from "../../../../lib/demo-ready";

export const dynamic = "force-dynamic";

export default async function FilingPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, reporting, fieldDefinitions, monitoring] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingReportingWorkspace(id, 2026).catch(() => null),
    getReportingFieldDefinitions().catch(() => []),
    getBuildingMonitoringWorkspace(id).catch(() => null)
  ]);

  if (!building || !reporting || !monitoring) {
    notFound();
  }

  const filingSummary = getFilingReadinessSummary({
    requiredFieldKeys: reporting.requiredFieldKeys,
    fieldDefinitions,
    inputValues: reporting.inputValues,
    blockers: reporting.blockers,
    latestCalculationRun: reporting.latestCalculationRun,
    filingStatus: reporting.cycle.filingStatus
  });
  const readiness = getBuildingReadiness({
    buildingId: building.id,
    basPresent: building.basPresent,
    basVendor: building.basVendor,
    basProtocol: building.basProtocol,
    basAccessState: building.basAccessState,
    pointListAvailable: building.pointListAvailable,
    schedulesAvailable: building.schedulesAvailable,
    equipmentInventoryStatus: building.equipmentInventoryStatus,
    gatewayCount: monitoring.gateways.length,
    telemetryCount: monitoring.telemetryEvents.length,
    whitelistedPointCount: monitoring.basPoints.filter((point) => point.isWritable && point.isWhitelisted).length
  });

  return (
    <AppShell
      buildingSection="filing"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          actions={
            <form action={createReportingCycleAction}>
              <input name="buildingId" type="hidden" value={building.id} />
              <input name="reportingYear" type="hidden" value="2026" />
              <button className="inline-flex min-h-11 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90" type="submit">
                Refresh 2026 cycle
              </button>
            </form>
          }
          description="Filing is the submission workspace. Use it to assemble the package, review accepted inputs, and see what still blocks filing."
          eyebrow="Filing"
          status={<StatusBadge label={`${reporting.cycle.articleSnapshot} / ${reporting.cycle.pathwaySnapshot}`} tone="accent" />}
          title={`${building.name} filing package`}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Ready to file", value: filingSummary.readinessLabel, tone: filingSummary.readyToFile ? "success" : "warning" },
            { label: "Complete", value: `${filingSummary.completionPercent}%` },
            { label: "Ready inputs", value: filingSummary.readyCount.toString(), tone: filingSummary.readyCount > 0 ? "success" : "default" },
            { label: "Blockers", value: filingSummary.blockerCount.toString(), tone: filingSummary.blockerCount > 0 ? "danger" : "default" }
          ]}
        />
      }
    >
      <WorkflowStoryCard
        badges={[
          { label: readiness.label, tone: readiness.tone },
          { label: `${filingSummary.pendingCount} pending review`, tone: filingSummary.pendingCount > 0 ? "warning" : "neutral" },
          { label: `${filingSummary.missingCount} missing`, tone: filingSummary.missingCount > 0 ? "danger" : "success" }
        ]}
        description="Filing is the bridge between compliance posture and building operations. Once the package is stable, move into monitoring to improve performance and defend future filings."
        links={[
          { label: "Review compliance", href: `/buildings/${building.id}/compliance`, variant: "secondary" },
          { label: "Improve building performance", href: `/buildings/${building.id}/monitoring` }
        ]}
        title="From filing to performance"
      />

      <ReportingWorkspace
        attestations={reporting.attestations}
        blockers={reporting.blockers}
        buildingId={building.id}
        documents={reporting.documents.map((document) => ({
          id: document.id,
          documentType: document.documentType,
          documentCategory: document.documentCategory,
          fileUrl: document.fileUrl,
          parsedStatus: document.parsedStatus
        }))}
        fieldDefinitions={fieldDefinitions}
        filingDueDate={reporting.cycle.filingDueDate}
        filingStatus={reporting.cycle.filingStatus}
        inputValues={reporting.inputValues}
        latestCalculationRun={reporting.latestCalculationRun}
        modules={reporting.modules}
        ownerOfRecordStatus={reporting.cycle.ownerOfRecordStatus}
        pecmStatuses={reporting.pecmStatuses}
        reportingCycleId={reporting.cycle.id}
        reportingYear={reporting.cycle.reportingYear}
        requiredFieldKeys={reporting.requiredFieldKeys}
      />
    </AppShell>
  );
}
