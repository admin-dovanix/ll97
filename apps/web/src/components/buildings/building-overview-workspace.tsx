"use client";

import { autoMatchPublicRecordAction, resolveCoverageAction } from "../../app/actions";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { formatDateTime, formatNumber } from "../../lib/utils";

type CandidateRow = {
  id: string;
  datasetName: string;
  address: string;
  bbl?: string | null;
  bin?: string | null;
  coveredStatus?: string | null;
  pathway?: string | null;
  article?: string | null;
  grossSquareFeet?: number | null;
};

type MatchRow = {
  id: string;
  publicRecordId: string;
  matchMethod: string;
  confidenceScore: number;
  status: string;
};

type AuditRow = {
  id: string;
  summary: string;
  action: string;
  actorType: string;
  createdAt: string;
};

export function BuildingOverviewWorkspace({
  auditEvents,
  buildingId,
  candidates,
  matches
}: {
  auditEvents: AuditRow[];
  buildingId: string;
  candidates: CandidateRow[];
  matches: MatchRow[];
}) {
  const [selected, setSelected] = useState<CandidateRow | null>(candidates[0] ?? null);

  const candidateColumns: DataTableColumn<CandidateRow>[] = [
    {
      id: "dataset",
      header: "Dataset",
      sortValue: (row) => row.datasetName,
      cell: (row) => row.datasetName
    },
    {
      id: "address",
      header: "Address",
      sortValue: (row) => row.address,
      cell: (row) => row.address
    },
    {
      id: "bbl",
      header: "BBL",
      sortValue: (row) => row.bbl ?? "",
      cell: (row) => row.bbl ?? "Missing"
    },
    {
      id: "bin",
      header: "BIN",
      sortValue: (row) => row.bin ?? "",
      cell: (row) => row.bin ?? "Missing"
    },
    {
      id: "pathway",
      header: "Pathway",
      sortValue: (row) => row.pathway ?? "",
      cell: (row) => row.pathway ?? "Unknown"
    },
    {
      id: "grossSqFt",
      header: "Gross SF",
      align: "right",
      sortValue: (row) => row.grossSquareFeet ?? 0,
      cell: (row) => formatNumber(row.grossSquareFeet ?? null)
    }
  ];

  const matchColumns: DataTableColumn<MatchRow>[] = [
    {
      id: "publicRecordId",
      header: "Matched record",
      sortValue: (row) => row.confidenceScore,
      cell: (row) => row.publicRecordId
    },
    {
      id: "matchMethod",
      header: "Match basis",
      sortValue: (row) => row.matchMethod,
      cell: (row) => row.matchMethod
    },
    {
      id: "confidenceScore",
      header: "Confidence",
      align: "right",
      sortValue: (row) => row.confidenceScore,
      cell: (row) => `${Math.round(row.confidenceScore * 100)}%`
    },
    {
      id: "matchStatus",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status.replaceAll("_", " ")} tone="neutral" />
    }
  ];

  return (
    <>
      <SectionContainer
        title="Public source candidate queue"
        description="The primary decision on overview is identity and coverage alignment. This queue shows public records that can tighten pathway, article, and covered-building confidence."
      >
        <DataTable
          columns={candidateColumns}
          data={candidates}
          emptyMessage="No public source candidates matched this building yet."
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
        />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer title="Quick actions" description="These actions operate directly on the building identity and coverage record without leaving the overview workspace.">
          <div className="grid gap-3">
            <form action={resolveCoverageAction} className="rounded-md border border-border bg-panelAlt p-4">
              <input name="buildingId" type="hidden" value={buildingId} />
              <input name="filingYear" type="hidden" value="2026" />
              <ActionButton type="submit">Resolve coverage for 2026</ActionButton>
            </form>
            <form action={autoMatchPublicRecordAction} className="rounded-md border border-border bg-panelAlt p-4">
              <input name="buildingId" type="hidden" value={buildingId} />
              <ActionButton type="submit">Auto-match top public candidate</ActionButton>
            </form>
          </div>
        </SectionContainer>

        <SectionContainer title="Confirmed matches" description="This ledger is narrower than the candidate queue because the backend only stores match method, status, and confidence for confirmed links.">
          <DataTable columns={matchColumns} data={matches} emptyMessage="No public source matches have been confirmed yet." />
        </SectionContainer>
      </div>

      <SectionContainer title="Recent activity" description="Recent audit events provide the operational history for coverage resolution, document linkage, and other building-level changes.">
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
            <p className="text-sm text-muted-foreground">No recent building activity is recorded yet.</p>
          )}
        </div>
      </SectionContainer>

      <SidePanel
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.datasetName}
        title={selected?.address ?? "Candidate detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selected.coveredStatus ?? "unknown"} tone="neutral" />
                {selected.pathway ? <StatusBadge label={selected.pathway} tone="accent" /> : null}
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>BBL: {selected.bbl ?? "missing"}</p>
                <p>BIN: {selected.bin ?? "missing"}</p>
                <p>Article: {selected.article ?? "unknown"}</p>
                <p>Gross SF: {formatNumber(selected.grossSquareFeet ?? null)}</p>
              </div>
            </section>
            <section className="grid gap-2">
              <p className="eyebrow">Primary action</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                Use this record to tighten the building identity graph before generating or defending compliance requirements.
              </div>
            </section>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
