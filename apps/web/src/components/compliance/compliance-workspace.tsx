"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { requirementStatusTone } from "../../lib/status";
import { formatCurrency, formatDateTime } from "../../lib/utils";

type RequirementRow = {
  id: string;
  requirement: string;
  status: string;
  evidence: string;
  owner: string;
  due: string;
  actionLabel: string;
  blockingReason?: string;
  acceptedEvidenceCount: number;
  pendingEvidenceCount: number;
  rejectedEvidenceCount: number;
  linkedDocuments: Array<{
    id: string;
    documentType: string;
    status: string;
    fileUrl?: string | null;
  }>;
};

type EvidenceDocumentRow = {
  id: string;
  documentType: string;
  status: string;
  fileUrl?: string | null;
  linkedRequirementCount: number;
};

type AuditEventRow = {
  id: string;
  summary: string;
  action: string;
  actorType: string;
  createdAt: string;
};

export function ComplianceWorkspace({
  requirements,
  documents,
  auditEvents,
  estimatedLateReportPenalty,
  estimatedEmissionsOverLimitPenalty
}: {
  requirements: RequirementRow[];
  documents: EvidenceDocumentRow[];
  auditEvents: AuditEventRow[];
  estimatedLateReportPenalty: number;
  estimatedEmissionsOverLimitPenalty: number;
}) {
  const [selected, setSelected] = useState<RequirementRow | null>(requirements[0] ?? null);

  const requirementColumns: DataTableColumn<RequirementRow>[] = [
    {
      id: "requirement",
      header: "Requirement",
      sortValue: (row) => row.due,
      cell: (row) => row.requirement
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status.replaceAll("_", " ")} tone={requirementStatusTone(row.status)} />
    },
    {
      id: "evidence",
      header: "Evidence",
      sortValue: (row) => row.evidence,
      cell: (row) => <StatusBadge label={row.evidence.replaceAll("_", " ")} tone={requirementStatusTone(row.evidence)} />
    },
    {
      id: "owner",
      header: "Owner",
      sortValue: (row) => row.owner,
      cell: (row) => row.owner.toUpperCase()
    },
    {
      id: "due",
      header: "Due",
      sortValue: (row) => row.due,
      cell: (row) => formatDateTime(row.due)
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => <span className="font-medium text-accent">{row.actionLabel}</span>
    }
  ];

  const evidenceColumns: DataTableColumn<EvidenceDocumentRow>[] = [
    {
      id: "documentType",
      header: "Document",
      sortValue: (row) => row.linkedRequirementCount,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.documentType}</p>
          <p className="text-xs text-muted-foreground">{row.fileUrl ?? "Local reference pending"}</p>
        </div>
      )
    },
    {
      id: "documentStatus",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status.replaceAll("_", " ")} tone={requirementStatusTone(row.status)} />
    },
    {
      id: "linkedRequirements",
      header: "Linked requirements",
      align: "right",
      sortValue: (row) => row.linkedRequirementCount,
      cell: (row) => row.linkedRequirementCount.toString()
    }
  ];

  const totalPenalty = estimatedLateReportPenalty + estimatedEmissionsOverLimitPenalty;

  return (
    <>
      <SectionContainer
        title="Requirements checklist"
        description="This checklist keeps filing readiness, evidence state, and ownership in one dense review surface so compliance leaders can decide what blocks submission."
      >
        <DataTable
          columns={requirementColumns}
          data={requirements}
          emptyMessage="Generate requirements to start the LL97 workflow."
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
        />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionContainer title="Penalty breakdown" description="Estimated penalties are surfaced separately so the team can distinguish emissions risk from filing process risk.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Over emissions</p>
              <p className="text-xl font-semibold">{formatCurrency(estimatedEmissionsOverLimitPenalty)}</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Filing penalties</p>
              <p className="text-xl font-semibold">{formatCurrency(estimatedLateReportPenalty)}</p>
            </div>
            <div className="rounded-md border border-border bg-panelAlt p-4">
              <p className="eyebrow">Total</p>
              <p className="text-xl font-semibold">{formatCurrency(totalPenalty)}</p>
            </div>
          </div>
        </SectionContainer>

        <SectionContainer title="Risk note" description="A brief operator-facing explanation keeps the decision model obvious.">
          <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
            {totalPenalty > 0
              ? "This building still carries measurable filing or over-limit exposure. The highest leverage move is to close blockers and attach accepted evidence to the requirements marked below."
              : "The current filing model is clean, but the checklist still needs evidence hygiene so the status remains defensible through submission."}
          </div>
        </SectionContainer>
      </div>

      <SectionContainer title="Evidence library" description="Linked documents remain visible beside the checklist so reviewers can see whether the evidence posture is mature enough for filing.">
        <DataTable columns={evidenceColumns} data={documents} emptyMessage="No evidence documents are attached yet." />
      </SectionContainer>

      <SectionContainer title="Audit trail" description="Recent review activity and evidence operations stay accessible without forcing navigation away from the filing workspace.">
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
            <p className="text-sm text-muted-foreground">No compliance audit events have been recorded yet.</p>
          )}
        </div>
      </SectionContainer>

      <SidePanel
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.owner.toUpperCase()}
        title={selected?.requirement ?? "Requirement detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selected.status.replaceAll("_", " ")} tone={requirementStatusTone(selected.status)} />
                <StatusBadge label={selected.evidence.replaceAll("_", " ")} tone={requirementStatusTone(selected.evidence)} />
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Due: {formatDateTime(selected.due)}</p>
                <p>Owner: {selected.owner.toUpperCase()}</p>
                {selected.blockingReason ? <p>Blocker: {selected.blockingReason}</p> : null}
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Evidence counts</p>
              <div className="grid gap-3 rounded-md border border-border bg-panelAlt p-4 md:grid-cols-3">
                <div>
                  <p className="eyebrow">Accepted</p>
                  <p className="text-lg font-semibold text-foreground">{selected.acceptedEvidenceCount}</p>
                </div>
                <div>
                  <p className="eyebrow">Pending</p>
                  <p className="text-lg font-semibold text-foreground">{selected.pendingEvidenceCount}</p>
                </div>
                <div>
                  <p className="eyebrow">Rejected</p>
                  <p className="text-lg font-semibold text-foreground">{selected.rejectedEvidenceCount}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Linked documents</p>
              {selected.linkedDocuments.length > 0 ? (
                <div className="grid gap-3">
                  {selected.linkedDocuments.map((document) => (
                    <div key={document.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{document.documentType}</p>
                      <p>Status: {document.status}</p>
                      <p>{document.fileUrl ?? "Local reference pending"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No linked documents are attached to this requirement yet.</p>
              )}
            </section>

            <ActionButton type="button">{selected.actionLabel}</ActionButton>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
