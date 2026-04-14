import { notFound } from "next/navigation";
import { Panel } from "@airwise/ui";
import { BuildingNav } from "../../../../components/building-nav";
import { PageShell } from "../../../../components/page-shell";
import { autoMatchPublicRecordAction, resolveCoverageAction } from "../../../actions";
import { getBuildingPublicSourceWorkspace, getBuildingWorkspace } from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function BuildingOverviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, publicSources] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingPublicSourceWorkspace(id).catch(() => null)
  ]);

  if (!building || !publicSources) {
    notFound();
  }

  return (
    <PageShell eyebrow="Building" title={`${building.name} overview`}>
      <BuildingNav buildingId={building.id} />

      <div className="grid two">
        <Panel title="Identity">
          <ul className="list">
            <li>Building ID: {id}</li>
            <li>BBL: {building.bbl ?? "Missing"}</li>
            <li>BIN: {building.bin ?? "Missing"}</li>
            <li>Gross square feet: {building.grossSquareFeet?.toLocaleString() ?? "Missing"}</li>
            <li>Gross floor area: {building.grossFloorArea?.toLocaleString() ?? "Missing"}</li>
          </ul>
        </Panel>

        <Panel title="Coverage">
          <ul className="list">
            <li>Article: {building.article}</li>
            <li>Pathway: {building.pathway}</li>
            <li>Confidence: {building.source.confidenceScore ?? "Unknown"}</li>
            <li>Source: {building.source.sourceRef}</li>
          </ul>

          <form action={resolveCoverageAction} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <input type="hidden" name="buildingId" value={building.id} />
            <input type="hidden" name="filingYear" value="2026" />
            <button type="submit">Resolve coverage for 2026</button>
          </form>
        </Panel>
      </div>

      <div className="grid two">
        <Panel title="Public source candidates">
          {publicSources.candidates.length === 0 ? (
            <p className="muted">No NYC source candidates matched this building yet.</p>
          ) : (
            <div className="grid" style={{ gap: 12 }}>
              {publicSources.candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  style={{
                    border: "1px solid rgba(22, 50, 39, 0.12)",
                    borderRadius: 14,
                    padding: 14
                  }}
                >
                  <strong>{candidate.datasetName}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>
                    {candidate.addressLine1}, {candidate.city ?? "Unknown city"}
                  </p>
                  <p style={{ margin: 0 }}>
                    BBL {candidate.bbl ?? "missing"} · BIN {candidate.bin ?? "missing"} · Pathway{" "}
                    {candidate.compliancePathway ?? "unknown"}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form action={autoMatchPublicRecordAction} style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <input type="hidden" name="buildingId" value={building.id} />
            <button type="submit">Auto-match top public candidate</button>
          </form>
        </Panel>

        <Panel title="Matched public records">
          {publicSources.matches.length === 0 ? (
            <p className="muted">No public source matches have been confirmed yet.</p>
          ) : (
            <ul className="list">
              {publicSources.matches.map((match) => (
                <li key={match.id}>
                  <strong>{match.publicRecordId}</strong> via {match.matchMethod} · Confidence{" "}
                  {match.confidenceScore}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
