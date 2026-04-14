import { notFound } from "next/navigation";
import { Panel } from "@airwise/ui";
import { canonicalPointTypes } from "@airwise/rules";
import { BuildingNav } from "../../../../components/building-nav";
import { PageShell } from "../../../../components/page-shell";
import { ingestTelemetryAction, startDiscoveryRunAction, updateBasPointAction } from "../../../actions";
import { getBuildingMonitoringWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, monitoring] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingMonitoringWorkspace(id).catch(() => null)
  ]);

  if (!building || !monitoring) {
    notFound();
  }

  const { issues, basPoints, telemetryEvents } = monitoring;
  const defaultTelemetryPoint = basPoints.find((point) => point.canonicalPointType === "co2") ?? basPoints[0];

  return (
    <PageShell eyebrow="Monitoring" title={`Ventilation telemetry for ${building.name}`}>
      <BuildingNav buildingId={building.id} />

      <div className="grid two">
        <Panel title="Read-first posture">
          <ul className="list">
            <li>BACnet discovery and read-only polling first</li>
            <li>Recommendation engine before command enablement</li>
            <li>Supervised writes only on whitelisted points</li>
          </ul>

          <form action={startDiscoveryRunAction} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <input type="hidden" name="buildingId" value={building.id} />
            <button type="submit">Run BAS discovery</button>
          </form>
        </Panel>

        <Panel title="Active issues">
          {issues.length === 0 ? (
            <p className="muted">No telemetry-derived issues yet. Start discovery to seed the pilot workflow.</p>
          ) : (
            <div className="grid">
              {issues.map((issue) => (
                <div key={issue.id} style={{ borderBottom: "1px solid rgba(22, 50, 39, 0.12)", paddingBottom: 12 }}>
                  <strong>{issue.issueType}</strong>
                  <p>{issue.summary}</p>
                  <p className="muted">Evidence window: {issue.evidenceWindow}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Discovered BAS points">
          {basPoints.length === 0 ? (
            <p className="muted">No BAS points discovered yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {basPoints.map((point) => (
                <form
                  key={point.id}
                  action={updateBasPointAction}
                  style={{
                    display: "grid",
                    gap: 8,
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <input type="hidden" name="buildingId" value={building.id} />
                  <input type="hidden" name="pointId" value={point.id} />
                  <strong>{point.objectName}</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {point.objectIdentifier} · Writable {point.isWritable ? "yes" : "no"}
                  </p>
                  <label>
                    Canonical point type
                    <select name="canonicalPointType" defaultValue={point.canonicalPointType ?? ""}>
                      <option value="">Unmapped</option>
                      {canonicalPointTypes.map((pointType) => (
                        <option key={pointType} value={pointType}>
                          {pointType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Safety category
                    <input name="safetyCategory" defaultValue={point.safetyCategory ?? ""} placeholder="operational" />
                  </label>
                  <label>
                    Command whitelist
                    <select name="isWhitelisted" defaultValue={point.isWhitelisted ? "true" : "false"}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                  <button type="submit">Update point mapping</button>
                </form>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Replay telemetry sample">
          {basPoints.length === 0 ? (
            <p className="muted">Run discovery before replaying telemetry.</p>
          ) : (
            <form action={ingestTelemetryAction} style={{ display: "grid", gap: 10 }}>
              <input type="hidden" name="buildingId" value={building.id} />
              <label>
                Point
                <select name="pointId" defaultValue={defaultTelemetryPoint?.id ?? basPoints[0]?.id}>
                  {basPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.objectName} ({point.canonicalPointType ?? "unmapped"})
                    </option>
                  ))}
                </select>
              </label>
              <input name="value" placeholder="Value" defaultValue="1100" required />
              <div className="grid two">
                <input name="unit" placeholder="Unit" defaultValue={defaultTelemetryPoint?.unit ?? "ppm"} />
                <select name="qualityFlag" defaultValue="ok">
                  <option value="ok">ok</option>
                  <option value="fault">fault</option>
                </select>
              </div>
              <input name="timestamp" placeholder="ISO timestamp" defaultValue="2026-04-14T23:30:00Z" />
              <button type="submit">Ingest telemetry</button>
            </form>
          )}
        </Panel>
      </div>

      <Panel title="Recent telemetry">
        {telemetryEvents.length === 0 ? (
          <p className="muted">No telemetry stored yet.</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {telemetryEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  borderBottom: "1px solid rgba(22, 50, 39, 0.12)",
                  paddingBottom: 12
                }}
              >
                <strong>{event.pointId ?? "Unknown point"}</strong>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {event.timestamp} · {event.unit ?? "unitless"} · {event.qualityFlag ?? "ok"}
                </p>
                <p style={{ margin: 0 }}>
                  Value: {event.valueNumeric ?? event.valueText ?? "n/a"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
