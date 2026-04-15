import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { BuildingOverviewWorkspace } from "../../../../components/buildings/building-overview-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import {
  getBuildingComplianceWorkspace,
  getBuildingDocumentsWorkspace,
  getBuildingMonitoringWorkspace,
  getBuildingPublicSourceWorkspace,
  getBuildingWorkspace
} from "../../../../lib/server-data";
import { buildingComplianceStatus } from "../../../../lib/status";
import { formatCurrency, formatNumber } from "../../../../lib/utils";

export const dynamic = "force-dynamic";

export default async function BuildingOverviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, publicSources, compliance, monitoring, documents] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingPublicSourceWorkspace(id).catch(() => null),
    getBuildingComplianceWorkspace(id).catch(() => null),
    getBuildingMonitoringWorkspace(id).catch(() => null),
    getBuildingDocumentsWorkspace(id).catch(() => null)
  ]);

  if (!building || !publicSources || !compliance || !monitoring || !documents) {
    notFound();
  }

  const penalty =
    (compliance.estimatedLateReportPenalty ?? 0) + (compliance.estimatedEmissionsOverLimitPenalty ?? 0);
  const status = buildingComplianceStatus({
    blockerCount: compliance.blockerCount,
    evidenceGapCount: compliance.evidenceGapCount,
    penalty
  });

  return (
    <AppShell
      buildingSection="overview"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          description="Identity, coverage confidence, and building risk stay visible in one place before the team branches into compliance or monitoring workflows."
          eyebrow="Building overview"
          status={<StatusBadge status={status} />}
          title={building.name}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Penalty exposure", value: formatCurrency(penalty), emphasize: true },
            { label: "Pathway", value: `${building.article} / ${building.pathway}` },
            { label: "Gross floor area", value: formatNumber(building.grossFloorArea ?? null) },
            { label: "Active issues", value: monitoring.issues.length.toString() }
          ]}
        />
      }
    >
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-border bg-panel p-4 shadow-inset">
          <p className="eyebrow">Identity</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
              <p>Building ID: {id}</p>
              <p>BBL: {building.bbl ?? "Missing"}</p>
              <p>BIN: {building.bin ?? "Missing"}</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
              <p>Address: {building.addressLine1}</p>
              <p>
                {building.city}, {building.state} {building.zip}
              </p>
              <p>Gross square feet: {formatNumber(building.grossSquareFeet ?? null)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-panel p-4 shadow-inset">
          <p className="eyebrow">Coverage</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
              <p>Article: {building.article}</p>
              <p>Pathway: {building.pathway}</p>
              <p>Confidence: {building.source.confidenceScore ?? "Unknown"}</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
              <p>Source ref: {building.source.sourceRef}</p>
              <p>Evidence gaps: {compliance.evidenceGapCount}</p>
              <p>Last activity: {documents.auditEvents[0]?.createdAt ?? "Unknown"}</p>
            </div>
          </div>
        </div>
      </section>

      <BuildingOverviewWorkspace
        auditEvents={documents.auditEvents}
        buildingId={building.id}
        candidates={publicSources.candidates.map((candidate) => ({
          id: candidate.id,
          datasetName: candidate.datasetName,
          address: `${candidate.addressLine1}, ${candidate.city ?? "Unknown city"}`,
          bbl: candidate.bbl,
          bin: candidate.bin,
          coveredStatus: candidate.coveredStatus,
          pathway: candidate.compliancePathway,
          article: candidate.article,
          grossSquareFeet: candidate.grossSquareFeet
        }))}
        matches={publicSources.matches.map((match) => ({
          id: match.id,
          publicRecordId: match.publicRecordId,
          matchMethod: match.matchMethod,
          confidenceScore: match.confidenceScore,
          status: match.status
        }))}
      />
    </AppShell>
  );
}
