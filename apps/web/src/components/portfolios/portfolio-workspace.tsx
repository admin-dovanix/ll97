"use client";

import Link from "next/link";
import { useState } from "react";
import { createPortfolioAction, importBuildingAction } from "../../app/actions";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SidePanel } from "../panels/side-panel";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { ActionButton } from "../ui/action-button";
import { formatCurrency } from "../../lib/utils";

type PortfolioRow = {
  id: string;
  portfolioId: string;
  buildingName: string;
  portfolioName: string;
  address: string;
  status: "non-compliant" | "at-risk" | "compliant" | "unknown";
  pathway: string;
  article: string;
  emissionsSignal: string;
  penalty: number;
  openIssues: number;
  actionLabel: string;
  blockerCount: number;
  evidenceGapCount: number;
  topIssues: string[];
  recommendedActions: string[];
};

type PortfolioOption = {
  id: string;
  name: string;
};

export function PortfolioWorkspace({
  rows,
  portfolios,
  canEdit
}: {
  rows: PortfolioRow[];
  portfolios: PortfolioOption[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState<PortfolioRow | null>(rows[0] ?? null);

  const columns: DataTableColumn<PortfolioRow>[] = [
    {
      id: "building",
      header: "Building name",
      sortValue: (row) => row.penalty,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{row.buildingName}</p>
          <p className="text-xs text-muted-foreground">{row.address}</p>
        </div>
      )
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      id: "pathway",
      header: "Pathway",
      sortValue: (row) => row.pathway,
      cell: (row) => (
        <div className="space-y-1">
          <p>{row.article}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.pathway}</p>
        </div>
      )
    },
    {
      id: "emissions",
      header: "Emissions vs limit",
      sortValue: (row) => row.emissionsSignal,
      cell: (row) => row.emissionsSignal
    },
    {
      id: "penalty",
      header: "Penalty ($)",
      align: "right",
      sortValue: (row) => row.penalty,
      cell: (row) => formatCurrency(row.penalty)
    },
    {
      id: "issues",
      header: "Open issues",
      align: "right",
      sortValue: (row) => row.openIssues,
      cell: (row) => row.openIssues.toString()
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <span className="font-medium text-accent" onClick={(event) => event.stopPropagation()}>
          <Link href={`/buildings/${row.id}/compliance`}>{row.actionLabel}</Link>
        </span>
      )
    }
  ];

  return (
    <>
      <SectionContainer
        title="Portfolio risk register"
        description="Rank buildings by penalty exposure, blockers, and active operational issues. Row selection keeps the operator in context while exposing evidence and next steps in a side panel."
      >
        <DataTable
          columns={columns}
          data={rows}
          emptyMessage="No buildings are visible in this portfolio scope yet."
          onRowClick={setSelected}
          selectedRowId={selected?.id ?? null}
        />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer
          title="Create portfolio"
          description="Use this workspace to onboard a new owner or carve out a new operating scope without leaving the dashboard."
        >
          {canEdit ? (
            <form action={createPortfolioAction} className="grid gap-3">
              <label>
                <span className="eyebrow">Portfolio name</span>
                <input name="name" placeholder="Northwest multifamily" required />
              </label>
              <label>
                <span className="eyebrow">Owner or operator</span>
                <input name="ownerName" placeholder="Institutional owner" />
              </label>
              <ActionButton type="submit">Create portfolio</ActionButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Only owner memberships can create new portfolios in this workspace.</p>
          )}
        </SectionContainer>

        <SectionContainer
          title="Import building"
          description="Add a building record directly into the active portfolio graph so compliance, monitoring, and document workflows are available immediately."
        >
          {canEdit && portfolios.length > 0 ? (
            <form action={importBuildingAction} className="grid gap-3">
              <label>
                <span className="eyebrow">Target portfolio</span>
                <select defaultValue={portfolios[0]?.id} name="portfolioId">
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Building name</span>
                <input name="name" placeholder="12 West 23rd Street" required />
              </label>
              <label>
                <span className="eyebrow">Address</span>
                <input name="addressLine1" placeholder="12 West 23rd Street" required />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">City</span>
                  <input defaultValue="New York" name="city" placeholder="New York" />
                </label>
                <label>
                  <span className="eyebrow">State</span>
                  <input defaultValue="NY" name="state" placeholder="NY" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">ZIP</span>
                  <input name="zip" placeholder="10001" />
                </label>
                <label>
                  <span className="eyebrow">BBL</span>
                  <input name="bbl" placeholder="1007640012" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">BIN</span>
                  <input name="bin" placeholder="1087342" />
                </label>
                <label>
                  <span className="eyebrow">Article</span>
                  <select defaultValue="" name="article">
                    <option value="">Unknown</option>
                    <option value="320">320</option>
                    <option value="321">321</option>
                  </select>
                </label>
              </div>
              <label>
                <span className="eyebrow">Pathway</span>
                <select defaultValue="" name="pathway">
                  <option value="">Unknown</option>
                  <option value="CP0">CP0</option>
                  <option value="CP1">CP1</option>
                  <option value="CP2">CP2</option>
                  <option value="CP3">CP3</option>
                  <option value="CP4">CP4</option>
                </select>
              </label>
              <ActionButton type="submit">Import building</ActionButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owner memberships can import buildings, and at least one portfolio must exist first.
            </p>
          )}
        </SectionContainer>
      </div>

      <SidePanel
        actions={
          selected ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-panelAlt px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              href={`/buildings/${selected.id}/overview`}
            >
              Open building
            </Link>
          ) : null
        }
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        subtitle={selected?.address}
        title={selected?.buildingName ?? "Building detail"}
      >
        {selected ? (
          <div className="grid gap-6">
            <section className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <StatusBadge label={selected.portfolioName} tone="neutral" />
                <StatusBadge label={`${selected.article} / ${selected.pathway}`} tone="accent" />
              </div>
              <div className="grid gap-3 rounded-md border border-border bg-panelAlt p-4 md:grid-cols-3">
                <div>
                  <p className="eyebrow">Penalty exposure</p>
                  <p className="text-lg font-semibold">{formatCurrency(selected.penalty)}</p>
                </div>
                <div>
                  <p className="eyebrow">Blockers</p>
                  <p className="text-lg font-semibold">{selected.blockerCount}</p>
                </div>
                <div>
                  <p className="eyebrow">Open issues</p>
                  <p className="text-lg font-semibold">{selected.openIssues}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Compliance summary</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                {selected.emissionsSignal}. Evidence gaps currently total {selected.evidenceGapCount}, which means the
                building still needs operator or consultant follow-through before the filing position is stable.
              </div>
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Top issues</p>
              {selected.topIssues.length > 0 ? (
                <ul className="list">
                  {selected.topIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No active operational issues are currently attached.</p>
              )}
            </section>

            <section className="grid gap-2">
              <p className="eyebrow">Recommended actions</p>
              {selected.recommendedActions.length > 0 ? (
                <ul className="list">
                  {selected.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recommended actions are available yet.</p>
              )}
            </section>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
