"use client";

import { autoMatchPublicRecordAction, resolveCoverageAction, updateBuildingBasProfileAction } from "../../app/actions";
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

type BasProfile = {
  basPresent: "yes" | "no" | "unknown";
  basVendor?: string;
  basProtocol: "unknown" | "bacnet_ip" | "bacnet_mstp" | "modbus" | "proprietary" | "other";
  basAccessState: "unknown" | "no_access" | "vendor_required" | "exports_available" | "direct_access_available";
  pointListAvailable: "yes" | "no" | "unknown";
  schedulesAvailable: "yes" | "no" | "unknown";
  ventilationSystemArchetype: "unknown" | "central_exhaust" | "make_up_air_unit" | "corridor_ahu" | "garage_ventilation" | "mixed_central";
  equipmentInventoryStatus: "unknown" | "not_started" | "partial" | "complete";
};

const availabilityOptions: Array<{ value: BasProfile["basPresent"]; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
];

const basProtocolOptions: Array<{ value: BasProfile["basProtocol"]; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "bacnet_ip", label: "BACnet/IP" },
  { value: "bacnet_mstp", label: "BACnet MS/TP" },
  { value: "modbus", label: "Modbus" },
  { value: "proprietary", label: "Proprietary" },
  { value: "other", label: "Other" }
];

const basAccessOptions: Array<{ value: BasProfile["basAccessState"]; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "no_access", label: "No access" },
  { value: "vendor_required", label: "Vendor required" },
  { value: "exports_available", label: "Exports available" },
  { value: "direct_access_available", label: "Direct access available" }
];

const archetypeOptions: Array<{ value: BasProfile["ventilationSystemArchetype"]; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "central_exhaust", label: "Central exhaust" },
  { value: "make_up_air_unit", label: "Make-up air unit" },
  { value: "corridor_ahu", label: "Corridor AHU" },
  { value: "garage_ventilation", label: "Garage ventilation" },
  { value: "mixed_central", label: "Mixed central" }
];

const inventoryOptions: Array<{ value: BasProfile["equipmentInventoryStatus"]; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "not_started", label: "Not started" },
  { value: "partial", label: "Partial" },
  { value: "complete", label: "Complete" }
];

export function BuildingOverviewWorkspace({
  auditEvents,
  basProfile,
  buildingId,
  candidates,
  matches
}: {
  auditEvents: AuditRow[];
  basProfile: BasProfile;
  buildingId: string;
  candidates: CandidateRow[];
  matches: MatchRow[];
}) {
  const [selected, setSelected] = useState<CandidateRow | null>(null);

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

      <div id="bas-profile">
        <SectionContainer
          title="BAS and systems profile"
          description="Capture the minimum BAS and ventilation-system context needed to classify a building before live telemetry exists."
        >
          <form action={updateBuildingBasProfileAction} className="grid gap-4 rounded-md border border-border bg-panelAlt p-4 md:grid-cols-2">
            <input name="buildingId" type="hidden" value={buildingId} />

            <label className="grid gap-2 text-sm text-muted-foreground">
              BAS present
              <select className="rounded-md border border-border bg-panel px-3 py-2 text-foreground" defaultValue={basProfile.basPresent} name="basPresent">
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              BAS vendor
              <input
                className="rounded-md border border-border bg-panel px-3 py-2 text-foreground"
                defaultValue={basProfile.basVendor ?? ""}
                name="basVendor"
                placeholder="Siemens, Alerton, Johnson Controls..."
                type="text"
              />
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              BAS protocol
              <select className="rounded-md border border-border bg-panel px-3 py-2 text-foreground" defaultValue={basProfile.basProtocol} name="basProtocol">
                {basProtocolOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              BAS access state
              <select className="rounded-md border border-border bg-panel px-3 py-2 text-foreground" defaultValue={basProfile.basAccessState} name="basAccessState">
                {basAccessOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              Point list available
              <select className="rounded-md border border-border bg-panel px-3 py-2 text-foreground" defaultValue={basProfile.pointListAvailable} name="pointListAvailable">
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              Schedules available
              <select className="rounded-md border border-border bg-panel px-3 py-2 text-foreground" defaultValue={basProfile.schedulesAvailable} name="schedulesAvailable">
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              Ventilation system archetype
              <select
                className="rounded-md border border-border bg-panel px-3 py-2 text-foreground"
                defaultValue={basProfile.ventilationSystemArchetype}
                name="ventilationSystemArchetype"
              >
                {archetypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-muted-foreground">
              Equipment inventory status
              <select
                className="rounded-md border border-border bg-panel px-3 py-2 text-foreground"
                defaultValue={basProfile.equipmentInventoryStatus}
                name="equipmentInventoryStatus"
              >
                {inventoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2 flex justify-end">
              <ActionButton type="submit">Save BAS profile</ActionButton>
            </div>
          </form>
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
