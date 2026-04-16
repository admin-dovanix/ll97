import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { ComplianceWorkspace } from "../../../../components/compliance/compliance-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { WorkflowStoryCard } from "../../../../components/workflow-story-card";
import { generateRequirementsAction } from "../../../actions";
import {
  getBuildingComplianceWorkspace,
  getBuildingDocumentsWorkspace,
  getBuildingMonitoringWorkspace,
  getBuildingWorkspace
} from "../../../../lib/server-data";
import { buildingComplianceStatus } from "../../../../lib/status";
import { formatCurrency, formatDate } from "../../../../lib/utils";

export const dynamic = "force-dynamic";

function formatRequirementLabel(type: string) {
  switch (type) {
    case "coverage_verification":
      return "Confirm the building is covered";
    case "pathway_verification":
      return "Confirm the LL97 filing pathway";
    case "article_320_emissions_report":
      return "Prepare the Article 320 emissions report";
    case "article_321_performance_report":
      return "Prepare the Article 321 performance report";
    case "article_321_prescriptive_report":
      return "Prepare the Article 321 prescriptive report";
    case "attestation_rdp":
      return "Obtain the RDP attestation";
    case "attestation_rcxa":
      return "Obtain the RCxA attestation";
    default:
      return type.replaceAll("_", " ");
  }
}

function formatRoleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "operator":
      return "Operator";
    case "rdp":
      return "RDP";
    case "rcxa":
      return "RCxA";
    default:
      return role.toUpperCase();
  }
}

function formatActionLabel(input: {
  evidenceState?: string;
  requiredRole: string;
  linkedDocumentCount: number;
  blockingReason?: string;
}) {
  if (input.blockingReason) {
    return "Resolve blocker";
  }

  if (input.evidenceState === "accepted") {
    return "Confirm filing package";
  }

  if (input.linkedDocumentCount > 0) {
    return "Review submitted evidence";
  }

  if (input.requiredRole === "owner") {
    return "Upload owner evidence";
  }

  return `Request ${formatRoleLabel(input.requiredRole)} input`;
}

function formatBlockingReason(input: { status: string; evidenceState?: string; blockingReason?: string }) {
  if (input.blockingReason) {
    return input.blockingReason;
  }

  if (input.status === "blocked" && input.evidenceState === "missing") {
    return "Waiting on required evidence before filing can proceed.";
  }

  if (input.evidenceState === "missing") {
    return "Evidence still needs to be uploaded.";
  }

  if (input.evidenceState === "pending_review") {
    return "Evidence is uploaded and waiting for review.";
  }

  return "No blocker is currently recorded.";
}

export default async function CompliancePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, compliance, documents, monitoring] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingComplianceWorkspace(id).catch(() => null),
    getBuildingDocumentsWorkspace(id).catch(() => null),
    getBuildingMonitoringWorkspace(id).catch(() => null)
  ]);

  if (!building || !compliance || !documents || !monitoring) {
    notFound();
  }

  const totalPenalty =
    (compliance.estimatedLateReportPenalty ?? 0) + (compliance.estimatedEmissionsOverLimitPenalty ?? 0);
  const buildingStatus = buildingComplianceStatus({
    blockerCount: compliance.blockerCount,
    evidenceGapCount: compliance.evidenceGapCount,
    penalty: totalPenalty
  });
  const earliestDueDate = [...compliance.requirements]
    .map((requirement) => requirement.dueDate)
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];
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
      requirement: formatRequirementLabel(requirement.type),
      status: requirement.status,
      evidence: requirement.evidenceState ?? "missing",
      owner: formatRoleLabel(requirement.requiredRole),
      due: requirement.dueDate,
      actionLabel: formatActionLabel({
        evidenceState: requirement.evidenceState,
        requiredRole: requirement.requiredRole,
        linkedDocumentCount: linkedDocuments.length,
        blockingReason: requirement.blockingReason
      }),
      blockingReason: formatBlockingReason({
        status: requirement.status,
        evidenceState: requirement.evidenceState,
        blockingReason: requirement.blockingReason
      }),
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
              <button className="inline-flex min-h-11 items-center whitespace-nowrap rounded-md border border-accent bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90" type="submit">
                Generate 2026 requirements
              </button>
            </form>
          }
          description="Compliance readiness, evidence posture, and penalty exposure stay in one review surface so a portfolio manager can see what is blocked, how serious it is, and who needs to act."
          eyebrow="Compliance"
          status={<StatusBadge label={`${building.article} / ${building.pathway}`} tone="accent" />}
          title={`${building.name} LL97 workspace`}
        />
      }
      kpis={
        <section className="overflow-hidden rounded-lg border border-border bg-panel">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <div className="border-b border-border px-6 py-5 xl:border-b-0 xl:border-r">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-danger">Penalty exposure</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <p className="text-[3.5rem] font-medium leading-none tracking-[-0.03em] text-danger">{formatCurrency(totalPenalty)}</p>
                <StatusBadge status={buildingStatus} />
              </div>
              <p className="mt-4 max-w-3xl text-[16px] leading-8 text-foreground/84">
                {building.name} faces {formatCurrency(totalPenalty)} in LL97 penalties. {compliance.evidenceGapCount} evidence
                {compliance.evidenceGapCount === 1 ? " gap is" : " gaps are"} blocking compliance. {compliance.blockerCount} active
                {compliance.blockerCount === 1 ? " blocker remains" : " blockers remain"}. Deadline: {formatDate(earliestDueDate)}.
              </p>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              <div className="border-b border-border px-5 py-5 sm:border-r sm:border-b-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58">Filing status</p>
                <p className="mt-3 text-2xl font-medium capitalize tracking-[-0.02em] text-foreground">{buildingStatus.replace("-", " ")}</p>
                <p className="mt-1 text-sm text-foreground/68">Current LL97 position</p>
              </div>
              <div className="border-b border-border px-5 py-5 sm:border-r sm:border-b-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58">Evidence gaps</p>
                <p className="mt-3 text-2xl font-medium tracking-[-0.02em] text-foreground">{compliance.evidenceGapCount}</p>
                <p className="mt-1 text-sm text-foreground/68">Items still missing</p>
              </div>
              <div className="px-5 py-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/58">Requirements ready</p>
                <p className="mt-3 text-2xl font-medium tracking-[-0.02em] text-foreground">{compliance.readyRequirementCount}</p>
                <p className="mt-1 text-sm text-foreground/68">Ready to submit</p>
              </div>
            </div>
          </div>
        </section>
      }
    >
      <WorkflowStoryCard
        badges={[
          { label: `${compliance.blockerCount} blockers`, tone: compliance.blockerCount > 0 ? "danger" : "success" },
          { label: `${compliance.evidenceGapCount} evidence gaps`, tone: compliance.evidenceGapCount > 0 ? "warning" : "success" },
          { label: `${monitoring.issues.length} monitoring issues`, tone: monitoring.issues.length > 0 ? "warning" : "neutral" }
        ]}
        description="Compliance sets the filing agenda. Once the requirements and evidence posture are clear, move straight into the filing workspace to see what is accepted, pending, and still missing."
        links={[
          { label: "Go to filing workspace", href: `/buildings/${building.id}/filing` },
          { label: "Open documents", href: `/buildings/${building.id}/documents`, variant: "secondary" }
        ]}
        title="From compliance to filing"
      />

      <ComplianceWorkspace
        auditEvents={documents.auditEvents}
        buildingId={building.id}
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
