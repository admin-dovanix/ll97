import { notFound } from "next/navigation";
import { Panel } from "@airwise/ui";
import { BuildingNav } from "../../../../components/building-nav";
import { PageShell } from "../../../../components/page-shell";
import {
  createRecommendationActionAction,
  updateRecommendationActionStatusAction
} from "../../../actions";
import { getBuildingMonitoringWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
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
  const { issues, recommendationActions } = monitoring;

  return (
    <PageShell eyebrow="Recommendations" title={`Operator actions for ${building.name}`}>
      <BuildingNav buildingId={building.id} />

      <div className="grid two">
        <Panel title="Current recommendations">
          {issues.length === 0 ? (
            <p className="muted">No operator recommendations are available yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{issue.issueType}</strong>
                  <p style={{ marginBottom: 6 }}>{issue.summary}</p>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    Status: {issue.status ?? "open"} · Assignee: {issue.assignedTo ?? "Unassigned"}
                  </p>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Recommended action: {issue.recommendedAction ?? "Collect operator review"}
                  </p>
                  <form action={createRecommendationActionAction} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="buildingId" value={building.id} />
                    <input type="hidden" name="recommendationId" value={issue.id} />
                    <input name="actionType" defaultValue="operator_review" required />
                    <input name="assignee" placeholder="Assignee" defaultValue={issue.assignedTo ?? ""} />
                    <input name="notes" placeholder="Action notes" />
                    <button type="submit">Create operator action</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Active recommendation actions">
          {recommendationActions.length === 0 ? (
            <p className="muted">No recommendation actions created yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {recommendationActions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{action.actionType}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    Status: {action.actionStatus} · Assignee: {action.assignee ?? "Unassigned"}
                  </p>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    Created: {action.createdAt}
                    {action.completedAt ? ` · Completed: ${action.completedAt}` : ""}
                  </p>
                  <form action={updateRecommendationActionStatusAction} style={{ display: "grid", gap: 8 }}>
                    <input type="hidden" name="buildingId" value={building.id} />
                    <input type="hidden" name="actionId" value={action.id} />
                    <select name="actionStatus" defaultValue={action.actionStatus}>
                      <option value="proposed">proposed</option>
                      <option value="in_progress">in_progress</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                    <input name="notes" placeholder="Update notes" defaultValue={action.notes ?? ""} />
                    <button type="submit">Update action status</button>
                  </form>
                  {action.beforeAfter ? (
                    <div style={{ marginTop: 12 }}>
                      <strong>Before / after</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        {action.beforeAfter.metricLabel}: {action.beforeAfter.baselineValue ?? "n/a"} to{" "}
                        {action.beforeAfter.comparisonValue ?? "n/a"}
                        {typeof action.beforeAfter.delta === "number"
                          ? ` (delta ${action.beforeAfter.delta >= 0 ? "+" : ""}${action.beforeAfter.delta})`
                          : ""}
                      </p>
                    </div>
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
