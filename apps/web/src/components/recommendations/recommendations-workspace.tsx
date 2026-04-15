"use client";

import { createRecommendationActionAction, updateRecommendationActionStatusAction } from "../../app/actions";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { ActionButton } from "../ui/action-button";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { formatDateTime } from "../../lib/utils";
import { requirementStatusTone } from "../../lib/status";

type RecommendationRow = {
  id: string;
  recommendation: string;
  status: string;
  confidence: number;
  system: string;
  evidenceWindow: string;
  assignee: string;
  executionPath: string;
  actionLabel: string;
  summary: string;
  recommendedAction: string;
  writebackEligible: boolean;
};

type ActionRow = {
  id: string;
  recommendationId: string;
  actionType: string;
  actionStatus: string;
  assignee?: string | null;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  beforeAfter?: {
    metricLabel: string;
    baselineValue?: number;
    comparisonValue?: number;
    delta?: number;
  } | null;
};

export function RecommendationsWorkspace({
  actions,
  buildingId,
  recommendations
}: {
  actions: ActionRow[];
  buildingId: string;
  recommendations: RecommendationRow[];
}) {
  const [selected, setSelected] = useState<RecommendationRow | null>(recommendations[0] ?? null);

  const recommendationColumns: DataTableColumn<RecommendationRow>[] = [
    {
      id: "recommendation",
      header: "Recommendation",
      sortValue: (row) => row.confidence,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.recommendation}</p>
          <p className="text-xs text-muted-foreground">{row.summary}</p>
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status.replaceAll("_", " ")} tone={requirementStatusTone(row.status)} />
    },
    {
      id: "confidence",
      header: "Confidence",
      align: "right",
      sortValue: (row) => row.confidence,
      cell: (row) => `${Math.round(row.confidence * 100)}%`
    },
    {
      id: "system",
      header: "System",
      sortValue: (row) => row.system,
      cell: (row) => row.system
    },
    {
      id: "execution",
      header: "Execution path",
      sortValue: (row) => row.executionPath,
      cell: (row) => row.executionPath
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => <span className="font-medium text-accent">{row.actionLabel}</span>
    }
  ];

  return (
    <>
      <SectionContainer
        title="Recommendation queue"
        description="Monitoring issues double as the current recommendation engine, so this table emphasizes confidence, actionability, and execution path rather than decorative analytics."
      >
        <DataTable
          columns={recommendationColumns}
          data={recommendations}
          emptyMessage="No operator recommendations are available yet."
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
        />
      </SectionContainer>

      <SectionContainer title="Operator action ledger" description="Every recommendation action remains visible as a simple operational log with before-and-after evidence when available.">
        <div className="grid gap-3">
          {actions.length > 0 ? (
            actions.map((action) => (
              <form key={action.id} action={updateRecommendationActionStatusAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
                <input name="buildingId" type="hidden" value={buildingId} />
                <input name="actionId" type="hidden" value={action.id} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{action.actionType}</p>
                  <StatusBadge label={action.actionStatus.replaceAll("_", " ")} tone={requirementStatusTone(action.actionStatus)} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Assignee: {action.assignee ?? "Unassigned"} · Created {formatDateTime(action.createdAt)}
                  {action.completedAt ? ` · Completed ${formatDateTime(action.completedAt)}` : ""}
                </p>
                {action.beforeAfter ? (
                  <p className="text-sm text-muted-foreground">
                    {action.beforeAfter.metricLabel}: {action.beforeAfter.baselineValue ?? "n/a"} to{" "}
                    {action.beforeAfter.comparisonValue ?? "n/a"}
                    {typeof action.beforeAfter.delta === "number"
                      ? ` (${action.beforeAfter.delta >= 0 ? "+" : ""}${action.beforeAfter.delta})`
                      : ""}
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_auto]">
                  <select defaultValue={action.actionStatus} name="actionStatus">
                    <option value="proposed">proposed</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <input defaultValue={action.notes ?? ""} name="notes" placeholder="Update notes" />
                  <ActionButton type="submit">Update</ActionButton>
                </div>
              </form>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No operator actions have been created yet.</p>
          )}
        </div>
      </SectionContainer>

      <SidePanel
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.system}
        title={selected?.recommendation ?? "Recommendation detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selected.status.replaceAll("_", " ")} tone={requirementStatusTone(selected.status)} />
                <StatusBadge label={`${Math.round(selected.confidence * 100)}% confidence`} tone="neutral" />
                {selected.writebackEligible ? <StatusBadge label="Writeback eligible" tone="accent" /> : null}
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>{selected.summary}</p>
                <p className="mt-2">Evidence window: {selected.evidenceWindow}</p>
                <p>Execution path: {selected.executionPath}</p>
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Why triggered</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                {selected.recommendedAction}
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Related actions</p>
              <div className="grid gap-3">
                {actions.filter((action) => action.recommendationId === selected.id).length > 0 ? (
                  actions
                    .filter((action) => action.recommendationId === selected.id)
                    .map((action) => (
                      <div key={action.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">{action.actionType}</p>
                        <p>Status: {action.actionStatus}</p>
                        <p>Assignee: {action.assignee ?? "Unassigned"}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">No actions have been attached to this recommendation yet.</p>
                )}
              </div>
            </section>

            <form action={createRecommendationActionAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
              <input name="buildingId" type="hidden" value={buildingId} />
              <input name="recommendationId" type="hidden" value={selected.id} />
              <label>
                <span className="eyebrow">Action type</span>
                <input defaultValue="operator_review" name="actionType" required />
              </label>
              <label>
                <span className="eyebrow">Assignee</span>
                <input defaultValue={selected.assignee === "Unassigned" ? "" : selected.assignee} name="assignee" placeholder="Operator owner" />
              </label>
              <label>
                <span className="eyebrow">Notes</span>
                <input name="notes" placeholder="Initial instruction" />
              </label>
              <ActionButton type="submit">{selected.actionLabel}</ActionButton>
            </form>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
