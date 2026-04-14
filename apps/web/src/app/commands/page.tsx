import { approveCommandAction, createCommandAction } from "../actions";
import { Panel } from "@airwise/ui";
import { PageShell } from "../../components/page-shell";
import { listCommandWorkspace } from "../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function CommandsPage() {
  const workspace = await listCommandWorkspace();
  const pointOptions = workspace.buildings.flatMap((building) =>
    (workspace.pointsByBuilding[building.id] ?? [])
      .filter((point) => point.isWhitelisted)
      .map((point) => ({
        value: `${building.id}::${point.id}`,
        label: `${building.name} - ${point.objectName} (${point.canonicalPointType ?? "unmapped"})`
      }))
  );
  const buildingLabels = Object.fromEntries(workspace.buildings.map((building) => [building.id, building.name]));

  return (
    <PageShell eyebrow="Commands" title="Supervised BAS command surface">
      <div className="grid two">
        <Panel title="Allowed in pilot mode">
          <ul className="list">
            <li>Schedule adjustments</li>
            <li>Occupancy mode toggles</li>
            <li>Temporary overrides with expiry</li>
          </ul>
        </Panel>

        <Panel title="Never allowed in v1">
          <ul className="list">
            <li>Life-safety points</li>
            <li>Fire and smoke control sequences</li>
            <li>Unclassified or non-whitelisted points</li>
          </ul>
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Request supervised command">
          {pointOptions.length > 0 ? (
            <form action={createCommandAction} style={{ display: "grid", gap: 10 }}>
              <label>
                Pilot target
                <select name="target" defaultValue={pointOptions[0]?.value ?? ""} required>
                  {pointOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <input name="commandType" placeholder="Command type" defaultValue="schedule_adjustment" required />
              <input name="requestedValue" placeholder="Requested value" defaultValue="unoccupied" required />
              <input name="expiresAt" placeholder="Expiry ISO datetime (optional)" />
              <button type="submit">Create command request</button>
            </form>
          ) : (
            <p className="muted">No BAS-enabled building is available yet.</p>
          )}
        </Panel>

        <Panel title="Open commands">
          {workspace.commands.length === 0 ? (
            <p className="muted">No commands created yet.</p>
          ) : (
            <div className="grid">
              {workspace.commands.map((command) => (
                <div
                  key={command.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{command.commandType}</strong>
                  <p className="muted">
                    {buildingLabels[command.buildingId] ?? command.buildingId} - Point {command.pointId}
                  </p>
                  <p>Previous value: {command.previousValue ?? "unknown"}</p>
                  <p>Requested value: {command.requestedValue}</p>
                  <p>Status: {command.status}</p>
                  <p>Requested at: {command.requestedAt}</p>
                  {command.executedAt ? <p>Executed at: {command.executedAt}</p> : null}
                  {command.expiresAt ? <p>Expires at: {command.expiresAt}</p> : null}
                  {command.rollbackExecutedAt ? <p>Rolled back at: {command.rollbackExecutedAt}</p> : null}
                  {command.executionNotes ? <p>Execution notes: {command.executionNotes}</p> : null}
                  {command.status === "pending_approval" ? (
                    <form action={approveCommandAction}>
                      <input type="hidden" name="commandId" value={command.id} />
                      <button type="submit">Approve command</button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
