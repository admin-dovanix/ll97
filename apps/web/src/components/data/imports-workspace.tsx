"use client";

import { useState } from "react";
import { formatDateTime, formatNumber } from "../../lib/utils";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";

type DatasetRow = {
  id: string;
  datasetName: string;
  latestSourceVersion?: string | null;
  recordCount: number;
  matchedIdentityCount: number;
  runCount: number;
  lastRunAt?: string | null;
  lastRunStatus: string;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
};

type ImportRunRow = {
  id: string;
  datasetName: string;
  sourceFile?: string | null;
  sourceVersion?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  summaryJson?: string | null;
};

function statusTone(status: string) {
  if (status === "completed" || status === "success") {
    return "success" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  if (status === "running" || status === "pending") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function ImportsWorkspace({
  datasets,
  runs
}: {
  datasets: DatasetRow[];
  runs: ImportRunRow[];
}) {
  const [selectedDataset, setSelectedDataset] = useState<DatasetRow | null>(null);
  const [selectedRun, setSelectedRun] = useState<ImportRunRow | null>(null);

  const datasetColumns: DataTableColumn<DatasetRow>[] = [
    {
      id: "dataset",
      header: "Dataset",
      sortValue: (row) => row.recordCount,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.datasetName}</p>
          <p className="text-xs text-muted-foreground">Version {row.latestSourceVersion ?? "unknown"}</p>
        </div>
      )
    },
    {
      id: "updated",
      header: "Last updated",
      sortValue: (row) => row.lastRunAt ?? "",
      cell: (row) => formatDateTime(row.lastRunAt)
    },
    {
      id: "records",
      header: "Records",
      align: "right",
      sortValue: (row) => row.recordCount,
      cell: (row) => formatNumber(row.recordCount)
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.lastRunStatus,
      cell: (row) => <StatusBadge label={row.lastRunStatus} tone={statusTone(row.lastRunStatus)} />
    }
  ];

  const runColumns: DataTableColumn<ImportRunRow>[] = [
    {
      id: "runDataset",
      header: "Dataset",
      sortValue: (row) => row.startedAt,
      cell: (row) => row.datasetName
    },
    {
      id: "runStatus",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status} tone={statusTone(row.status)} />
    },
    {
      id: "runStarted",
      header: "Started",
      sortValue: (row) => row.startedAt,
      cell: (row) => formatDateTime(row.startedAt)
    },
    {
      id: "rowCount",
      header: "Rows",
      align: "right",
      sortValue: (row) => row.rowCount,
      cell: (row) => formatNumber(row.rowCount)
    }
  ];

  return (
    <>
      <SectionContainer
        title="Dataset status"
        description="This page tracks freshness, import quality, and identity coverage for public-source datasets without forcing the owner to leave the operational workspace."
      >
        <DataTable
          columns={datasetColumns}
          data={datasets}
          emptyMessage="No public datasets have been imported yet."
          onRowClick={(row) => {
            setSelectedRun(null);
            setSelectedDataset(row);
          }}
          selectedRowId={selectedDataset?.id ?? null}
        />
      </SectionContainer>

      <SectionContainer title="Recent import runs" description="Detailed run history highlights source file lineage and row-level outcomes.">
        <DataTable
          columns={runColumns}
          data={runs}
          emptyMessage="No import runs are currently recorded."
          onRowClick={(row) => {
            setSelectedDataset(null);
            setSelectedRun(row);
          }}
          selectedRowId={selectedRun?.id ?? null}
        />
      </SectionContainer>

      <SidePanel
        onClose={() => {
          setSelectedDataset(null);
          setSelectedRun(null);
        }}
        open={Boolean(selectedDataset || selectedRun)}
        subtitle={selectedRun?.sourceFile ?? selectedDataset?.latestSourceVersion ?? undefined}
        title={selectedRun?.datasetName ?? selectedDataset?.datasetName ?? "Import detail"}
      >
        {selectedDataset ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <p className="eyebrow">Freshness</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Latest version: {selectedDataset.latestSourceVersion ?? "unknown"}</p>
                <p>Last run: {formatDateTime(selectedDataset.lastRunAt)}</p>
                <p>Tracked runs: {selectedDataset.runCount}</p>
              </div>
            </section>
            <section className="grid gap-2">
              <p className="eyebrow">Coverage quality</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Imported records: {formatNumber(selectedDataset.recordCount)}</p>
                <p>Records with BBL or BIN: {formatNumber(selectedDataset.matchedIdentityCount)}</p>
                <p>
                  Import mix: +{formatNumber(selectedDataset.insertedCount)} inserted, {formatNumber(selectedDataset.updatedCount)}
                  {" "}updated, {formatNumber(selectedDataset.skippedCount)} skipped
                </p>
              </div>
            </section>
          </div>
        ) : null}

        {selectedRun ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selectedRun.status} tone={statusTone(selectedRun.status)} />
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Source file: {selectedRun.sourceFile ?? "CLI / manual source"}</p>
                <p>Version: {selectedRun.sourceVersion ?? "unknown"}</p>
                <p>Started: {formatDateTime(selectedRun.startedAt)}</p>
                <p>Completed: {formatDateTime(selectedRun.completedAt)}</p>
                <p>Rows processed: {formatNumber(selectedRun.rowCount)}</p>
              </div>
            </section>
            <section className="grid gap-2">
              <p className="eyebrow">Outcome</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Inserted: {formatNumber(selectedRun.insertedCount)}</p>
                <p>Updated: {formatNumber(selectedRun.updatedCount)}</p>
                <p>Skipped: {formatNumber(selectedRun.skippedCount)}</p>
                {selectedRun.summaryJson ? <p>Summary: {selectedRun.summaryJson}</p> : null}
              </div>
            </section>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
