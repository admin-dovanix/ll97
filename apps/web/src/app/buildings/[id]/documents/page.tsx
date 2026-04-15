import { notFound } from "next/navigation";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { DocumentsWorkspace } from "../../../../components/documents/documents-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { getBuildingDocumentsWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, workspace] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingDocumentsWorkspace(id).catch(() => null)
  ]);

  if (!building || !workspace) {
    notFound();
  }

  const { documents, requirements, evidenceLinks, auditEvents } = workspace;
  const requirementRows = requirements.map((requirement) => ({
    id: requirement.id,
    requirement: requirement.type.replaceAll("_", " "),
    status: requirement.status,
    evidenceState: requirement.evidenceState ?? "missing",
    accepted: requirement.acceptedEvidenceCount ?? 0,
    pending: requirement.pendingEvidenceCount ?? 0,
    rejected: requirement.rejectedEvidenceCount ?? 0,
    ownerRole: requirement.requiredRole,
    dueDate: requirement.dueDate,
    linkedDocuments: evidenceLinks
      .filter((link) => link.requirementId === requirement.id)
      .map((link) => ({
        id: link.id,
        documentType: link.documentType,
        linkStatus: link.linkStatus,
        notes: link.notes
      }))
  }));

  return (
    <AppShell
      buildingSection="documents"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          description="Document intake, evidence linkage, and audit history are organized around filing requirements so reviewers can see exactly what is still missing."
          eyebrow="Documents"
          status={<StatusBadge label={`${documents.length} documents`} tone="accent" />}
          title={`Evidence workspace for ${building.name}`}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Documents", value: documents.length.toString(), emphasize: true },
            { label: "Requirements", value: requirements.length.toString() },
            { label: "Evidence links", value: evidenceLinks.length.toString() },
            { label: "Audit events", value: auditEvents.length.toString() }
          ]}
        />
      }
    >
      <DocumentsWorkspace
        auditEvents={auditEvents}
        buildingId={building.id}
        documents={documents.map((document) => ({
          id: document.id,
          documentType: document.documentType,
          status: document.status,
          fileUrl: document.fileUrl,
          classificationConfidence: document.classificationConfidence,
          linkedRequirementCount: evidenceLinks.filter((link) => link.documentId === document.id).length
        }))}
        requirements={requirementRows}
      />
    </AppShell>
  );
}
