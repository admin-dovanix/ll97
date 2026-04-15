import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { ComplianceWorkspace } from "../../../../components/compliance/compliance-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { generateRequirementsAction } from "../../../actions";
import {
  getBuildingComplianceWorkspace,
  getBuildingDocumentsWorkspace,
  getBuildingWorkspace
} from "../../../../lib/server-data";
import { buildingComplianceStatus } from "../../../../lib/status";
import { formatCurrency } from "../../../../lib/utils";

export const dynamic = "force-dynamic";

export default async function CompliancePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, compliance, documents] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingComplianceWorkspace(id).catch(() => null),
    getBuildingDocumentsWorkspace(id).catch(() => null)
  ]);

  if (!building || !compliance || !documents) {
    notFound();
  }

  const totalPenalty =
    (compliance.estimatedLateReportPenalty ?? 0) + (compliance.estimatedEmissionsOverLimitPenalty ?? 0);
  const buildingStatus = buildingComplianceStatus({
    blockerCount: compliance.blockerCount,
    evidenceGapCount: compliance.evidenceGapCount,
    penalty: totalPenalty
  });
  const requirements = compliance.requirements.map((requirement) => {
    const linkedDocuments = documents.evidenceLinks
      .filter((link) => link.requirementId === requirement.id)
      .map((link) => ({
        id: link.id,
        documentType: link.documentType,
        status: link.linkStatus,
        fileUrl: documents.documents.find((document) => document.id === link.documentId)?.fileUrl
      }));

    return {
      id: requirement.id,
      requirement: requirement.type.replaceAll("_", " "),
      status: requirement.status,
      evidence: requirement.evidenceState ?? "missing",
      owner: requirement.requiredRole,
      due: requirement.dueDate,
      actionLabel:
        requirement.evidenceState === "accepted"
          ? "Review audit trail"
          : linkedDocuments.length > 0
            ? "Review evidence"
            : "Upload evidence",
      blockingReason: requirement.blockingReason,
      acceptedEvidenceCount: requirement.acceptedEvidenceCount ?? 0,
      pendingEvidenceCount: requirement.pendingEvidenceCount ?? 0,
      rejectedEvidenceCount: requirement.rejectedEvidenceCount ?? 0,
      linkedDocuments
    };
  });

  return (
    <AppShell
      buildingSection="compliance"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          actions={
            <form action={generateRequirementsAction}>
              <input name="buildingId" type="hidden" value={building.id} />
              <input name="reportingYear" type="hidden" value="2026" />
              <button className="inline-flex min-h-11 items-center rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90" type="submit">
                Generate 2026 requirements
              </button>
            </form>
          }
          description="Compliance readiness, evidence posture, and penalty exposure stay in one review surface so a portfolio manager can decide what is missing and who owns it."
          eyebrow="Compliance"
          status={<StatusBadge label={`${building.article} / ${building.pathway}`} tone="accent" />}
          title={`${building.name} LL97 workspace`}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Status", value: buildingStatus.replace("-", " "), detail: "Filing posture", emphasize: true },
            { label: "Total penalty", value: formatCurrency(totalPenalty) },
            { label: "Evidence gaps", value: compliance.evidenceGapCount.toString() },
            { label: "Requirements ready", value: compliance.readyRequirementCount.toString() }
          ]}
        />
      }
    >
      <ComplianceWorkspace
        auditEvents={documents.auditEvents}
        documents={documents.documents.map((document) => ({
          id: document.id,
          documentType: document.documentType,
          status: document.status,
          fileUrl: document.fileUrl,
          linkedRequirementCount: documents.evidenceLinks.filter((link) => link.documentId === document.id).length
        }))}
        estimatedEmissionsOverLimitPenalty={compliance.estimatedEmissionsOverLimitPenalty ?? 0}
        estimatedLateReportPenalty={compliance.estimatedLateReportPenalty ?? 0}
        requirements={requirements}
      />
    </AppShell>
  );
}
