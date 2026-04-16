"use client";

import {
  ingestGatewaySnapshotAction,
  ingestTelemetryAction,
  registerBacnetGatewayAction,
  replayMonitoringScenarioAction,
  startDiscoveryRunAction,
  updateBasPointAction,
  updateGatewayConfigAction
} from "../../app/actions";
import { DataTable, type DataTableColumn } from "../data-display/data-table";
import { SectionContainer } from "../ui/section-container";
import { StatusBadge } from "../ui/status-badge";
import { ActionButton } from "../ui/action-button";
import { SidePanel } from "../panels/side-panel";
import { useState } from "react";
import { formatDateTime } from "../../lib/utils";
import { requirementStatusTone } from "../../lib/status";

type MonitoringIssueRow = {
  id: string;
  issue: string;
  severity: string;
  system: string;
  impact: string;
  action: string;
  summary: string;
  evidenceWindow: string;
  confidenceScore: number;
  writebackEligible: boolean;
};

type SystemRow = {
  id: string;
  systemName: string;
  assetType: string;
  location: string;
  status: string;
  sourceGateway: string;
};

type TelemetryRow = {
  id: string;
  pointLabel: string;
  timestamp: string;
  unit: string;
  quality: string;
  value: string;
};

type GatewayRow = {
  id: string;
  name: string;
  status: string;
  protocol: string;
  host?: string | null;
  port?: number | null;
  vendor?: string | null;
  runtimeMode: string;
  lastSeenAt?: string | null;
  heartbeatStatus?: string | null;
  ingestToken?: string | null;
  commandEndpoint?: string | null;
  pollIntervalSeconds?: number;
  lastPollRequestedAt?: string | null;
  lastPollCompletedAt?: string | null;
  nextPollDueAt?: string | null;
  bridgeBackend: string;
  sdkModulePath: string;
  sdkExportName: string;
  sdkConfigJson: string;
  validationStatus: string;
  validationIssues: string[];
  validationWarnings: string[];
  validationPointCount?: number;
  validationWritablePointCount?: number;
  validationWhitelistedPointCount?: number;
  dispatchTimeoutSeconds?: number;
  maxDispatchAttempts?: number;
  lastReplayScenario?: string | null;
  lastReplayAt?: string | null;
};

type PointRow = {
  id: string;
  objectName: string;
  objectIdentifier: string;
  canonicalPointType?: string | null;
  isWritable: boolean;
  isWhitelisted: boolean;
  safetyCategory?: string | null;
};

type DispatchRow = {
  id: string;
  gatewayId: string;
  status: string;
  commandId: string;
  pointId: string;
  createdAt: string;
  dispatchedAt?: string | null;
  acknowledgedAt?: string | null;
  deliveryAttemptCount: number;
  errorMessage?: string | null;
};

const sampleGatewaySnapshot = `{
  "gateway": {
    "name": "Pilot BACnet Gateway",
    "protocol": "BACnet/IP",
    "vendor": "FieldServer",
    "host": "10.10.4.15",
    "port": 47808
  },
  "observedAt": "2026-04-14T23:30:00Z",
  "assets": [
    {
      "assetKey": "garage_exhaust",
      "systemName": "Garage Exhaust System",
      "assetType": "fan_system",
      "location": "Garage",
      "points": [
        {
          "pointKey": "garage_schedule",
          "objectIdentifier": "schedule,4",
          "objectName": "Garage Exhaust Schedule",
          "canonicalPointType": "schedule",
          "unit": "enum",
          "isWritable": true,
          "presentValue": "occupied"
        }
      ]
    }
  ]
}`;

const sampleProviderConfigJson = `{
  "targetAddress": "192.168.1.50:47808",
  "deviceInstance": 25001,
  "systemName": "Corridor AHU",
  "location": "Roof",
  "skipWhoIs": true,
  "writePriority": 8,
  "points": [
    {
      "pointKey": "corridor_fan_status",
      "objectIdentifier": "binary-input,5",
      "canonicalPointType": "fan_status"
    },
    {
      "pointKey": "corridor_manual_override",
      "objectIdentifier": "binary-value,14",
      "canonicalPointType": "manual_override",
      "isWritable": true,
      "isWhitelisted": true,
      "valueType": "binary"
    },
    {
      "pointKey": "corridor_occupancy_mode",
      "objectIdentifier": "multi-state-value,9",
      "canonicalPointType": "occupancy_mode",
      "isWritable": true,
      "isWhitelisted": true,
      "valueType": "enumerated",
      "enumMap": {
        "unoccupied": 1,
        "occupied": 2,
        "standby": 3
      }
    },
    {
      "pointKey": "corridor_co2",
      "objectIdentifier": "analog-input,18",
      "canonicalPointType": "co2",
      "unit": "ppm",
      "valueType": "real"
    }
  ]
}`;

const replayScenarioOptions = [
  { value: "high_co2_low_ventilation", label: "High CO2 / low ventilation" },
  { value: "after_hours_runtime", label: "After-hours runtime" },
  { value: "schedule_mismatch", label: "Schedule mismatch" },
  { value: "stale_override", label: "Stale override" },
  { value: "sensor_fault", label: "Sensor fault" }
];

function severityTone(severity: string) {
  if (severity === "high") {
    return "danger" as const;
  }

  if (severity === "medium") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function MonitoringWorkspace({
  buildingId,
  gateways,
  issues,
  pointTypeOptions,
  points,
  systems,
  telemetry,
  dispatches
}: {
  buildingId: string;
  gateways: GatewayRow[];
  issues: MonitoringIssueRow[];
  pointTypeOptions: string[];
  points: PointRow[];
  systems: SystemRow[];
  telemetry: TelemetryRow[];
  dispatches: DispatchRow[];
}) {
  const [selectedIssue, setSelectedIssue] = useState<MonitoringIssueRow | null>(null);
  const primaryGateway = gateways[0] ?? null;

  const issueColumns: DataTableColumn<MonitoringIssueRow>[] = [
    {
      id: "issue",
      header: "Issue",
      sortValue: (row) => row.confidenceScore,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.issue}</p>
          <p className="text-xs text-muted-foreground">{row.summary}</p>
        </div>
      )
    },
    {
      id: "severity",
      header: "Severity",
      sortValue: (row) => row.severity,
      cell: (row) => <StatusBadge label={row.severity} tone={severityTone(row.severity)} />
    },
    {
      id: "system",
      header: "System",
      sortValue: (row) => row.system,
      cell: (row) => row.system
    },
    {
      id: "impact",
      header: "Impact",
      sortValue: (row) => row.impact,
      cell: (row) => row.impact
    },
    {
      id: "action",
      header: "Action",
      className: "whitespace-nowrap",
      cell: (row) => <span className="font-medium text-accent">{row.action}</span>
    }
  ];

  const systemColumns: DataTableColumn<SystemRow>[] = [
    {
      id: "systemName",
      header: "System",
      sortValue: (row) => row.systemName,
      cell: (row) => row.systemName
    },
    {
      id: "assetType",
      header: "Asset type",
      sortValue: (row) => row.assetType,
      cell: (row) => row.assetType
    },
    {
      id: "location",
      header: "Location",
      sortValue: (row) => row.location,
      cell: (row) => row.location
    },
    {
      id: "systemStatus",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => <StatusBadge label={row.status} tone={requirementStatusTone(row.status)} />
    }
  ];

  const telemetryColumns: DataTableColumn<TelemetryRow>[] = [
    {
      id: "telemetryPoint",
      header: "Point",
      sortValue: (row) => row.timestamp,
      cell: (row) => row.pointLabel
    },
    {
      id: "telemetryValue",
      header: "Latest value",
      sortValue: (row) => row.value,
      cell: (row) => row.value
    },
    {
      id: "telemetryTime",
      header: "Timestamp",
      sortValue: (row) => row.timestamp,
      cell: (row) => formatDateTime(row.timestamp)
    },
    {
      id: "telemetryQuality",
      header: "Quality",
      sortValue: (row) => row.quality,
      cell: (row) => row.quality
    }
  ];

  const dispatchColumns: DataTableColumn<DispatchRow>[] = [
    {
      id: "dispatchStatus",
      header: "Dispatch",
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.status}</p>
          <p className="text-xs text-muted-foreground">{row.commandId}</p>
        </div>
      )
    },
    {
      id: "dispatchAttempts",
      header: "Attempts",
      sortValue: (row) => row.deliveryAttemptCount,
      cell: (row) => row.deliveryAttemptCount.toString()
    },
    {
      id: "dispatchPoint",
      header: "Point",
      sortValue: (row) => row.pointId,
      cell: (row) => row.pointId
    },
    {
      id: "dispatchUpdated",
      header: "Last activity",
      sortValue: (row) => row.acknowledgedAt ?? row.dispatchedAt ?? row.createdAt,
      cell: (row) => formatDateTime(row.acknowledgedAt ?? row.dispatchedAt ?? row.createdAt)
    }
  ];

  return (
    <>
      <SectionContainer
        title="Active issues"
        description="Monitoring is decision-first: open issues lead the page, not charts. Each row captures what is wrong, how severe it is, and the next operator action."
      >
        <DataTable
          columns={issueColumns}
          data={issues}
          emptyMessage="No telemetry-derived issues are open right now."
          onRowClick={setSelectedIssue}
          selectedRowId={selectedIssue?.id ?? null}
        />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer title="Systems and assets" description="Discovered HVAC systems remain visible as operational inventory beneath the issue queue.">
          <DataTable columns={systemColumns} data={systems} emptyMessage="No systems have been discovered yet." />
        </SectionContainer>

        <SectionContainer title="Latest telemetry" description="Default to the latest values instead of charts unless the operator needs a deeper drill-down.">
          <DataTable columns={telemetryColumns} data={telemetry} emptyMessage="No telemetry has been ingested yet." />
        </SectionContainer>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer title="Gateways" description="Runtime health and ingest credentials stay visible beside the operating queue.">
          <div className="grid gap-3">
            {gateways.length > 0 ? (
              gateways.map((gateway) => (
                <div key={gateway.id} className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{gateway.name}</p>
                    <StatusBadge label={gateway.status} tone={requirementStatusTone(gateway.status)} />
                    <StatusBadge label={gateway.runtimeMode} tone="neutral" />
                    <StatusBadge label={gateway.validationStatus} tone={gateway.validationStatus === "valid" ? "success" : gateway.validationStatus === "warning" ? "warning" : "danger"} />
                  </div>
                  <p className="mt-2">
                    {gateway.protocol}
                    {gateway.host ? ` · ${gateway.host}` : ""}
                    {gateway.port ? `:${gateway.port}` : ""}
                  </p>
                  <p className="mt-2">Last seen: {formatDateTime(gateway.lastSeenAt)}</p>
                  <p>Heartbeat: {gateway.heartbeatStatus ?? "unknown"}</p>
                  <p>Poll cadence: {gateway.pollIntervalSeconds ?? 300}s</p>
                  <p>Next poll due: {formatDateTime(gateway.nextPollDueAt)}</p>
                  <p>Dispatch policy: {gateway.dispatchTimeoutSeconds ?? 180}s timeout / {gateway.maxDispatchAttempts ?? 3} attempts</p>
                  <p>Token: {gateway.ingestToken ?? "not generated"}</p>
                  <p>Bridge backend: {gateway.bridgeBackend}</p>
                  {gateway.lastReplayScenario ? <p>Last replay: {gateway.lastReplayScenario} at {formatDateTime(gateway.lastReplayAt)}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No BACnet gateways are registered yet.</p>
            )}
          </div>
        </SectionContainer>

        <SectionContainer title="Register gateway" description="Create the runtime contract entry point for BACnet discovery, telemetry, and supervised command dispatch.">
          <form action={registerBacnetGatewayAction} className="grid gap-3">
            <input name="buildingId" type="hidden" value={buildingId} />
            <label>
              <span className="eyebrow">Gateway name</span>
              <input defaultValue="Pilot BACnet Gateway" name="name" required />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="eyebrow">Protocol</span>
                <input defaultValue="BACnet/IP" name="protocol" />
              </label>
              <label>
                <span className="eyebrow">Vendor</span>
                <input defaultValue="FieldServer" name="vendor" />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="eyebrow">Host</span>
                <input defaultValue="10.10.4.15" name="host" />
              </label>
              <label>
                <span className="eyebrow">Port</span>
                <input defaultValue="47808" name="port" />
              </label>
            </div>
            <ActionButton type="submit">Register gateway</ActionButton>
          </form>
        </SectionContainer>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer
          title="Gateway config"
          description="Prepare the bridge/provider contract before live device access arrives. Validation highlights missing point definitions, enum maps, and dispatch policy gaps."
        >
          {primaryGateway ? (
            <form action={updateGatewayConfigAction} className="grid gap-3">
              <input name="buildingId" type="hidden" value={buildingId} />
              <input name="gatewayId" type="hidden" value={primaryGateway.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">Bridge backend</span>
                  <select defaultValue={primaryGateway.bridgeBackend} name="bridgeBackend">
                    <option value="bacnet-sdk">bacnet-sdk</option>
                    <option value="file-feed">file-feed</option>
                    <option value="simulated">simulated</option>
                  </select>
                </label>
                <label>
                  <span className="eyebrow">SDK export</span>
                  <input defaultValue={primaryGateway.sdkExportName} name="sdkExportName" />
                </label>
              </div>
              <label>
                <span className="eyebrow">SDK module path</span>
                <input
                  defaultValue={primaryGateway.sdkModulePath || "/Users/karan/Documents/LL97/apps/gateway-bridge/src/providers/bacnet-js-provider.ts"}
                  name="sdkModulePath"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">Dispatch timeout (seconds)</span>
                  <input defaultValue={primaryGateway.dispatchTimeoutSeconds ?? 180} name="dispatchTimeoutSeconds" />
                </label>
                <label>
                  <span className="eyebrow">Max dispatch attempts</span>
                  <input defaultValue={primaryGateway.maxDispatchAttempts ?? 3} name="maxDispatchAttempts" />
                </label>
              </div>
              <label>
                <span className="eyebrow">SDK config JSON</span>
                <textarea defaultValue={primaryGateway.sdkConfigJson || sampleProviderConfigJson} name="sdkConfigJson" rows={18} />
              </label>
              <ActionButton type="submit">Validate and save gateway config</ActionButton>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>
                  Validation summary: {primaryGateway.validationPointCount ?? 0} points, {primaryGateway.validationWritablePointCount ?? 0} writable,{" "}
                  {primaryGateway.validationWhitelistedPointCount ?? 0} whitelisted
                </p>
                {primaryGateway.validationIssues.length > 0 ? (
                  <div className="mt-3 grid gap-1">
                    <p className="font-medium text-foreground">Issues</p>
                    {primaryGateway.validationIssues.map((issue) => (
                      <p key={issue}>- {issue}</p>
                    ))}
                  </div>
                ) : null}
                {primaryGateway.validationWarnings.length > 0 ? (
                  <div className="mt-3 grid gap-1">
                    <p className="font-medium text-foreground">Warnings</p>
                    {primaryGateway.validationWarnings.map((warning) => (
                      <p key={warning}>- {warning}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Register a gateway first so the provider config can be validated and stored.</p>
          )}
        </SectionContainer>

        <SectionContainer
          title="Replay issue scenarios"
          description="Generate realistic discovery and telemetry sequences for the current gateway so we can prove issue detection, recommendation generation, and command observability without live hardware."
        >
          {primaryGateway ? (
            <form action={replayMonitoringScenarioAction} className="grid gap-3">
              <input name="buildingId" type="hidden" value={buildingId} />
              <input name="gatewayId" type="hidden" value={primaryGateway.id} />
              <label>
                <span className="eyebrow">Scenario</span>
                <select defaultValue={replayScenarioOptions[0]?.value} name="scenario">
                  {replayScenarioOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Observed at (optional)</span>
                <input defaultValue="" name="observedAt" placeholder="Leave blank to use a scenario-friendly timestamp" />
              </label>
              <ActionButton type="submit">Replay monitoring scenario</ActionButton>
              <p className="text-sm text-muted-foreground">
                Replay refreshes the gateway snapshot, injects scenario telemetry, and re-runs monitoring rules for this building.
              </p>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Register a gateway first so replay events have a runtime target.</p>
          )}
        </SectionContainer>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionContainer title="Import discovery snapshot" description="Ingest gateway discovery directly from the workspace when a runtime payload is already available.">
          <form action={ingestGatewaySnapshotAction} className="grid gap-3">
            <input name="buildingId" type="hidden" value={buildingId} />
            <label>
              <span className="eyebrow">Snapshot JSON</span>
              <textarea defaultValue={sampleGatewaySnapshot} name="snapshotJson" rows={14} />
            </label>
            <ActionButton type="submit">Import snapshot</ActionButton>
          </form>
        </SectionContainer>

        <SectionContainer title="Replay telemetry sample" description="Useful for local verification when the operator needs to validate issue generation or recommendation behavior.">
          {points.length > 0 ? (
            <form action={ingestTelemetryAction} className="grid gap-3">
              <input name="buildingId" type="hidden" value={buildingId} />
              <label>
                <span className="eyebrow">Point</span>
                <select defaultValue={points[0]?.id} name="pointId">
                  {points.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.objectName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">Value</span>
                  <input defaultValue="1100" name="value" required />
                </label>
                <label>
                  <span className="eyebrow">Unit</span>
                  <input defaultValue="ppm" name="unit" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="eyebrow">Quality</span>
                  <select defaultValue="ok" name="qualityFlag">
                    <option value="ok">ok</option>
                    <option value="fault">fault</option>
                  </select>
                </label>
                <label>
                  <span className="eyebrow">Timestamp</span>
                  <input defaultValue="2026-04-14T23:30:00Z" name="timestamp" />
                </label>
              </div>
              <ActionButton type="submit">Ingest telemetry</ActionButton>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Run discovery before replaying telemetry samples.</p>
          )}
        </SectionContainer>
      </div>

      <SectionContainer
        title="Gateway dispatch board"
        description="Delivered, retried, failed, and dead-letter dispatches stay visible so runtime problems are obvious before we connect a real BAS."
      >
        <DataTable columns={dispatchColumns} data={dispatches} emptyMessage="No gateway dispatches have been created yet." />
      </SectionContainer>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <SectionContainer title="Point mapping" description="Canonical point typing and writeback whitelisting stay close to monitoring so the operator can clean up discovery results in place.">
          <div className="grid gap-3">
            {points.length > 0 ? (
              points.map((point) => (
                <form key={point.id} action={updateBasPointAction} className="grid gap-3 rounded-md border border-border bg-panelAlt p-4">
                  <input name="buildingId" type="hidden" value={buildingId} />
                  <input name="pointId" type="hidden" value={point.id} />
                  <div>
                    <p className="font-medium text-foreground">{point.objectName}</p>
                    <p className="text-xs text-muted-foreground">{point.objectIdentifier}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label>
                      <span className="eyebrow">Canonical type</span>
                      <select defaultValue={point.canonicalPointType ?? ""} name="canonicalPointType">
                        <option value="">Unmapped</option>
                        {pointTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className="eyebrow">Safety category</span>
                      <input defaultValue={point.safetyCategory ?? ""} name="safetyCategory" placeholder="operational" />
                    </label>
                    <label>
                      <span className="eyebrow">Command whitelist</span>
                      <select defaultValue={point.isWhitelisted ? "true" : "false"} name="isWhitelisted">
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </label>
                  </div>
                  <ActionButton type="submit">Update point mapping</ActionButton>
                </form>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No BAS points have been discovered yet.</p>
            )}
          </div>
        </SectionContainer>

        <SectionContainer title="Fallback discovery" description="Use only for demo or local verification when a runtime payload is not yet available.">
          <form action={startDiscoveryRunAction} className="grid gap-3">
            <input name="buildingId" type="hidden" value={buildingId} />
            <ActionButton type="submit">Run fallback BAS discovery</ActionButton>
          </form>
        </SectionContainer>
      </div>

      <SidePanel
        onClose={() => setSelectedIssue(null)}
        open={Boolean(selectedIssue)}
        subtitle={selectedIssue?.system}
        title={selectedIssue?.issue ?? "Issue detail"}
      >
        {selectedIssue ? (
          <div className="grid gap-6">
            <section className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={selectedIssue.severity} tone={severityTone(selectedIssue.severity)} />
                <StatusBadge label={selectedIssue.system} tone="neutral" />
                {selectedIssue.writebackEligible ? <StatusBadge label="Writeback eligible" tone="accent" /> : null}
              </div>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                <p>{selectedIssue.summary}</p>
                <p className="mt-2">Evidence window: {selectedIssue.evidenceWindow}</p>
                <p>Confidence: {Math.round(selectedIssue.confidenceScore * 100)}%</p>
              </div>
            </section>
            <section className="grid gap-2">
              <p className="eyebrow">Recommended fix</p>
              <div className="rounded-md border border-border bg-panelAlt p-4 text-sm text-muted-foreground">
                {selectedIssue.action}
              </div>
            </section>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
