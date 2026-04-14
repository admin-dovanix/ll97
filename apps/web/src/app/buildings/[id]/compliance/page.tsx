import { notFound } from "next/navigation";
import { Badge, Panel } from "@airwise/ui";
import { BuildingNav } from "../../../../components/building-nav";
import { PageShell } from "../../../../components/page-shell";
import { generateRequirementsAction } from "../../../actions";
import { getBuildingComplianceWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function CompliancePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, compliance] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingComplianceWorkspace(id).catch(() => null)
  ]);

  if (!building || !compliance) {
    notFound();
  }

  return (
    <PageShell eyebrow="Compliance" title={`${building.name} LL97 workspace`} aside={<Badge label={building.pathway} />}>
      <BuildingNav buildingId={building.id} />

      <div className="grid two">
        <Panel title="Readiness">
          <ul className="list">
            <li>Building ID: {id}</li>
            <li>Article: {compliance.article}</li>
            <li>Blockers: {compliance.blockerCount}</li>
            <li>Requirements ready: {compliance.readyRequirementCount}</li>
            <li>Evidence gaps: {compliance.evidenceGapCount}</li>
            <li>Late report estimate: ${compliance.estimatedLateReportPenalty?.toLocaleString()}</li>
            <li>
              Over-limit estimate:{" "}
              {compliance.estimatedEmissionsOverLimitPenalty === null
                ? "Not applicable"
                : `$${compliance.estimatedEmissionsOverLimitPenalty.toLocaleString()}`}
            </li>
          </ul>

          <form action={generateRequirementsAction} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <input type="hidden" name="buildingId" value={building.id} />
            <input type="hidden" name="reportingYear" value="2026" />
            <button type="submit">Generate 2026 requirements</button>
          </form>
        </Panel>

        <Panel title="Requirements">
          <div className="grid">
            {compliance.requirements.map((requirement) => (
              <div
                key={requirement.id}
                style={{
                  border: "1px solid rgba(22, 50, 39, 0.12)",
                  borderRadius: 14,
                  padding: 14
                }}
              >
                <strong>{requirement.type}</strong>
                <p className="muted">{requirement.requiredRole}</p>
                <p>Status: {requirement.status}</p>
                <p>
                  Evidence: {requirement.evidenceState ?? "missing"} · Accepted {requirement.acceptedEvidenceCount ?? 0}
                  {" · "}Pending {requirement.pendingEvidenceCount ?? 0} · Rejected{" "}
                  {requirement.rejectedEvidenceCount ?? 0}
                </p>
                <p>Due: {requirement.dueDate}</p>
                {requirement.blockingReason ? <p>Blocker: {requirement.blockingReason}</p> : null}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
