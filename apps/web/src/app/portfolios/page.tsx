import Link from "next/link";
import { Panel } from "@airwise/ui";
import { PageShell } from "../../components/page-shell";
import { createPortfolioAction, importBuildingAction } from "../actions";
import { listPortfolioWorkspaces } from "../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function PortfoliosPage() {
  const portfolios = await listPortfolioWorkspaces();

  return (
    <PageShell eyebrow="Portfolio" title="Pilot portfolio workspace">
      <div className="grid two">
        <Panel title="Create portfolio">
          <form action={createPortfolioAction} style={{ display: "grid", gap: 10 }}>
            <input name="name" placeholder="Portfolio name" required />
            <input name="ownerName" placeholder="Owner / operator" />
            <button type="submit">Create portfolio</button>
          </form>
        </Panel>

        <Panel title="Operating note">
          <p className="muted">
            Import a building, resolve its pathway, generate LL97 requirements, and move one ventilation system into
            the read-first monitoring flow.
          </p>
        </Panel>
      </div>

      <div className="grid">
        {portfolios.length === 0 ? (
          <Panel title="No portfolios yet">
            <p className="muted">Create the first portfolio above to start the pilot workspace.</p>
          </Panel>
        ) : null}

        {portfolios.map((portfolio) => (
          <section key={portfolio.id} className="grid" style={{ gap: 16 }}>
            <div className="grid two">
              <Panel title={portfolio.name}>
                <p className="muted">
                  NYC-first portfolio view for ranking LL97 exposure, missing evidence, and ventilation pilot scope.
                </p>
                <ul className="list">
                  <li>Buildings: {portfolio.buildingCount}</li>
                  <li>Pathway focus: {portfolio.primaryPathwayLabel}</li>
                  <li>Portfolio status: {portfolio.status}</li>
                </ul>
              </Panel>

              <Panel title="Pilot actions">
                <ul className="list">
                  <li>Resolve pathway and evidence gaps.</li>
                  <li>Attach owner and consultant documents to requirements.</li>
                  <li>Move one ventilation system from read-only to recommendations.</li>
                </ul>
              </Panel>
            </div>

            <Panel title="Buildings">
              <div className="grid">
                {portfolio.buildings.map((building) => (
                  <div
                    key={building.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: 16,
                      border: "1px solid rgba(22, 50, 39, 0.12)",
                      borderRadius: 16,
                      background: "rgba(255, 255, 255, 0.72)"
                    }}
                  >
                    <div>
                      <strong>{building.name}</strong>
                      <p className="muted" style={{ marginBottom: 0 }}>
                        {building.addressLine1}, {building.city} {building.state}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <span>{building.article}</span>
                      <span>{building.pathway}</span>
                      <Link href={`/buildings/${building.id}/overview`}>Open building</Link>
                    </div>
                  </div>
                ))}
              </div>

              <form action={importBuildingAction} style={{ display: "grid", gap: 10, marginTop: 20 }}>
                <strong>Import one building into this portfolio</strong>
                <input type="hidden" name="portfolioId" value={portfolio.id} />
                <input name="name" placeholder="Building name" required />
                <input name="addressLine1" placeholder="Address line 1" required />
                <div className="grid two">
                  <input name="city" placeholder="City" defaultValue="New York" />
                  <input name="state" placeholder="State" defaultValue="NY" />
                </div>
                <div className="grid two">
                  <input name="zip" placeholder="ZIP" />
                  <input name="bbl" placeholder="BBL" />
                </div>
                <div className="grid two">
                  <input name="bin" placeholder="BIN" />
                  <select name="article" defaultValue="">
                    <option value="">Article</option>
                    <option value="320">320</option>
                    <option value="321">321</option>
                  </select>
                </div>
                <select name="pathway" defaultValue="">
                  <option value="">Pathway</option>
                  <option value="CP0">CP0</option>
                  <option value="CP1">CP1</option>
                  <option value="CP2">CP2</option>
                  <option value="CP3">CP3</option>
                  <option value="CP4">CP4</option>
                </select>
                <button type="submit">Import building</button>
              </form>
            </Panel>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
