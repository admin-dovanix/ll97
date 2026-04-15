"use client";

import { attachEvidenceAction, uploadDocumentAction } from "../../app/actions";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { formatDateTime } from "../../lib/utils";
import { requirementStatusTone } from "../../lib/status";

type RequirementRow = {
  id: string;
  requirement: string;
  status: string;
  evidenceState: string;
  accepted: number;
  pending: number;
  rejected: number;
  ownerRole: string;
  dueDate: string;
  linkedDocuments: Array<{
    id: string;
    documentType: string;
    linkStatus: string;
    notes?: string | null;
  }>;
};

type DocumentRow = {
  id: string;
  documentType: string;
  status: string;
  fileUrl?: string | null;
  classificationConfidence?: number | null;
  linkedRequirementCount: number;
};

type AuditRow = {
  id: string;
  summary: string;
  action: string;
  actorType: string;
  createdAt: string;
};

export function DocumentsWorkspace({
  auditEvents,
  buildingId,
  documents,
  requirements
}: {
  auditEvents: AuditRow[];
  buildingId: string;
  documents: DocumentRow[];
  requirements: RequirementRow[];
}) {
  const [selected, setSelected] = useState<RequirementRow | null>(requirements[0] ?? null);

  const requirementColumns: DataTableColumn<RequirementRow>[] = [
    {
      id: "requirement",
      header: "Requirement",
      sortValue: (row) => row.dueDate,
      cell: (row) => row.requirement
    },
    {
      id: "evidenceState",
      header: "Evidence state",
      sortValue: (row) => row.evidenceState,
      cell: (row) => <StatusBadge label={row.evidenceState.replaceAll("_", " ")} tone={requirementStatusTone(row.evidenceState)} />
    },
    {
      id: "accepted",
      header: "Accepted",
      align: "right",
      sortValue: (row) => row.accepted,
      cell: (row) => row.accepted.toString()
    },
    {
      id: "pending",
      header: "Pending",
      align: "right",
      sortValue: (row) => row.pending,
      cell: (row) => row.pending.toString()
    },
    {
      id: "ownerRole",
      header: "Owner role",
      sortValue: (row) => row.ownerRole,
      cell: (row) => row.ownerRole.toUpperCase()
    },
    {
      id: "action",
      header: "Primary action",
      cell: (row) => <span className="font-medium text-accent">{row.linkedDocuments.length ? "Review evidence" : "Attach evidence"}</span>
    }
  ];

  const documentColumns: DataTableColumn<DocumentRow>[] = [
    {
      id: "documentType",
      header: "Document type",
      sortValue: (row) => row.linkedRequirementCount,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.documentType}</p>
          <p className="text-xs text-muted-foreground">{row.fileUrl ?? "Reference pending"}</p>
        </div>
      )
    },
    {
      id: "documentStatus",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status} tone={requirementStatusTone(row.status)} />
    },
    {
      id: "confidence",
      header: "Confidence",
      align: "right",
      sortValue: (row) => row.classificationConfidence ?? 0,
      cell: (row) =>
        typeof row.classificationConfidence === "number"
          ? `${Math.round(row.classificationConfidence * 100)}%`
          : "n/a"
    },
    {
      id: "linkedRequirementCount",
      header: "Linked requirements",
      align: "right",
      sortValue: (row) => row.linkedRequirementCount,
      cell: (row) => row.linkedRequirementCount.toString()
    }
  ];

  return (
    <>
      <SectionContainer
        title="Requirement evidence matrix"
        description="The document workspace is requirement-first so the compliance team can see exactly which filing requirement still lacks evidence and what review state each document is in."
      >
        <DataTable
          columns={requirementColumns}
          data={requirements}
          emptyMessage="Generate requirements before attaching evidence."
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
        />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer title="Attach document metadata" description="Document intake is metadata-only today, but it is enough to anchor evidence review and audit history.">
          <form action={uploadDocumentAction} className="grid gap-3">
            <input name="buildingId" type="hidden" value={buildingId} />
            <label>
              <span className="eyebrow">Document type</span>
              <input name="documentType" placeholder="Emissions report" required />
            </label>
            <label>
              <span className="eyebrow">File URL or reference</span>
              <input name="fileUrl" placeholder="s3://... or local reference" />
            </label>
            <ActionButton type="submit">Attach document</ActionButton>
          </form>
        </SectionContainer>

        <SectionContainer title="Bind evidence to requirement" description="Attach an uploaded document to the exact filing requirement that it supports, including initial review status.">
          {documents.length > 0 && requirements.length > 0 ? (
            <form action={attachEvidenceAction} className="grid gap-3">
              <input name="buildingId" type="hidden" value={buildingId} />
              <label>
                <span className="eyebrow">Document</span>
                <select defaultValue={documents[0]?.id} name="documentId">
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.documentType}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Requirement</span>
                <select defaultValue={requirements[0]?.id} name="requirementId">
                  {requirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      {requirement.requirement}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Review outcome</span>
                <select defaultValue="pending_review" name="linkStatus">
                  <option value="pending_review">Pending review</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label>
                <span className="eyebrow">Notes</span>
                <input name="notes" placeholder="Review context" />
              </label>
              <ActionButton type="submit">Attach evidence</ActionButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Upload at least one document and generate requirements before linking evidence.</p>
          )}
        </SectionContainer>
      </div>

      <SectionContainer title="Document inventory" description="The inventory stays secondary to the requirement matrix but remains visible for quality control and intake review.">
        <DataTable columns={documentColumns} data={documents} emptyMessage="No documents are attached yet." />
      </SectionContainer>

      <SectionContainer title="Audit trail" description="Audit events provide the review spine for evidence changes even though the current metadata model is intentionally lightweight.">
        <div className="grid gap-3">
          {auditEvents.length > 0 ? (
            auditEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm">
                <p className="font-medium text-foreground">{event.summary}</p>
                <p className="mt-1 text-muted-foreground">
                  {event.action} · {event.actorType} · {formatDateTime(event.createdAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No audit events have been captured yet.</p>
          )}
        </div>
      </SectionContainer>

      <SidePanel
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.ownerRole.toUpperCase()}
        title={selected?.requirement ?? "Requirement detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selected.status.replaceAll("_", " ")} tone={requirementStatusTone(selected.status)} />
                <StatusBadge label={selected.evidenceState.replaceAll("_", " ")} tone={requirementStatusTone(selected.evidenceState)} />
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Due: {formatDateTime(selected.dueDate)}</p>
                <p>Owner role: {selected.ownerRole.toUpperCase()}</p>
                <p>
                  Evidence counts: {selected.accepted} accepted, {selected.pending} pending, {selected.rejected} rejected
                </p>
              </div>
            </section>
            <section className="grid gap-2">
              <p className="eyebrow">Linked documents</p>
              {selected.linkedDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {selected.linkedDocuments.map((document) => (
                    <div key={document.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{document.documentType}</p>
                      <p>Status: {document.linkStatus}</p>
                      {document.notes ? <p>Notes: {document.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents are attached to this requirement yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
