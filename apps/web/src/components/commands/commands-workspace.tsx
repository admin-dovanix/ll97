"use client";

import { useState } from "react";
import { approveCommandAction, createCommandAction } from "../../app/actions";
import { commandStatusTone } from "../../lib/status";
import { formatDateTime } from "../../lib/utils";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";

type PointOption = {
  value: string;
  label: string;
};

type CommandRow = {
  id: string;
  command: string;
  status: string;
  target: string;
  requestedBy: string;
  requestedAt: string;
  requestedValue: string;
  previousValue?: string | null;
  expiresAt?: string | null;
  executedAt?: string | null;
  rollbackExecutedAt?: string | null;
  executionNotes?: string | null;
  dispatchStatus?: string | null;
  dispatchAttempts?: number;
  lastDeliveryAttemptAt?: string | null;
  dispatchError?: string | null;
};

const commandStatusLabels: Record<string, string> = {
  pending_approval: "Requested",
  approved: "Approved",
  dispatch_pending: "Dispatch pending",
  dispatch_failed: "Dispatch failed",
  executed: "Executed",
  expired: "Expired",
  failed: "Failed"
};

export function CommandsWorkspace({
  canApprove,
  pointOptions,
  rows
}: {
  canApprove: boolean;
  pointOptions: PointOption[];
  rows: CommandRow[];
}) {
  const [selected, setSelected] = useState<CommandRow | null>(rows[0] ?? null);

  const columns: DataTableColumn<CommandRow>[] = [
    {
      id: "command",
      header: "Command",
      sortValue: (row) => row.requestedAt,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.command}</p>
          <p className="text-xs text-muted-foreground">{row.requestedValue}</p>
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <StatusBadge
          label={commandStatusLabels[row.status] ?? row.status}
          tone={commandStatusTone(row.status)}
        />
      )
    },
    {
      id: "target",
      header: "Target",
      sortValue: (row) => row.target,
      cell: (row) => row.target
    },
    {
      id: "requestedBy",
      header: "Requested by",
      sortValue: (row) => row.requestedBy,
      cell: (row) => row.requestedBy
    },
    {
      id: "time",
      header: "Time",
      sortValue: (row) => row.requestedAt,
      cell: (row) => formatDateTime(row.requestedAt)
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <span className="font-medium text-accent">
          {row.status === "pending_approval" ? "Review approval" : "Inspect lifecycle"}
        </span>
      )
    }
  ];

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <SectionContainer
          title="Command blotter"
          description="Supervised BAS write-back requests remain visible as a lifecycle table so operators can review pending approvals, dispatch outcomes, and rollbacks without losing the queue."
        >
          <DataTable columns={columns} data={rows} onRowClick={setSelected} selectedRowId={selected?.id ?? null} />
        </SectionContainer>

        <SectionContainer
          title="Request command"
          description="The v1 surface is intentionally constrained to whitelisted, operational points with supervised approval."
        >
          {pointOptions.length > 0 ? (
            <form action={createCommandAction} className="grid gap-3">
              <label>
                <span className="eyebrow">Pilot target</span>
                <select defaultValue={pointOptions[0]?.value ?? ""} name="target" required>
                  {pointOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Command</span>
                <input defaultValue="schedule_adjustment" name="commandType" placeholder="schedule_adjustment" required />
              </label>
              <label>
                <span className="eyebrow">Requested value</span>
                <input defaultValue="unoccupied" name="requestedValue" placeholder="unoccupied" required />
              </label>
              <label>
                <span className="eyebrow">Expiry (optional)</span>
                <input name="expiresAt" placeholder="2026-04-16T18:00:00Z" />
              </label>
              <ActionButton type="submit">Request supervised command</ActionButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No whitelisted BAS points are available for command write-back yet.</p>
          )}
        </SectionContainer>
      </div>

      <SidePanel
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.target}
        title={selected?.command ?? "Command detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={commandStatusLabels[selected.status] ?? selected.status}
                  tone={commandStatusTone(selected.status)}
                />
                <StatusBadge label={selected.target} tone="neutral" />
              </div>
              <div className="grid gap-3 rounded-md border border-border bg-panelAlt p-4 md:grid-cols-2">
                <div>
                  <p className="eyebrow">Requested by</p>
                  <p className="text-sm text-foreground">{selected.requestedBy}</p>
                </div>
                <div>
                  <p className="eyebrow">Requested at</p>
                  <p className="text-sm text-foreground">{formatDateTime(selected.requestedAt)}</p>
                </div>
                <div>
                  <p className="eyebrow">Previous value</p>
                  <p className="text-sm text-foreground">{selected.previousValue ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="eyebrow">Requested value</p>
                  <p className="text-sm text-foreground">{selected.requestedValue}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Command lifecycle</p>
              <ul className="list">
                <li>Requested: {formatDateTime(selected.requestedAt)}</li>
                <li>Executed: {formatDateTime(selected.executedAt)}</li>
                <li>Expires: {formatDateTime(selected.expiresAt)}</li>
                <li>Rollback: {formatDateTime(selected.rollbackExecutedAt)}</li>
              </ul>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Dispatch logs</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>Status: {selected.dispatchStatus ?? "No dispatch yet"}</p>
                <p>Attempts: {selected.dispatchAttempts ?? 0}</p>
                <p>Last delivery: {formatDateTime(selected.lastDeliveryAttemptAt)}</p>
                {selected.dispatchError ? <p>Failure: {selected.dispatchError}</p> : null}
                {selected.executionNotes ? <p>Notes: {selected.executionNotes}</p> : null}
              </div>
            </section>

            {canApprove && selected.status === "pending_approval" ? (
              <form action={approveCommandAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
                <input name="commandId" type="hidden" value={selected.id} />
                <ActionButton type="submit">Approve command</ActionButton>
              </form>
            ) : null}
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
