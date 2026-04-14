import Link from "next/link";
import { Badge, Panel } from "@airwise/ui";
import { appRoles, getCurrentRole } from "../lib/auth";
import { setDevRoleAction } from "./actions";
import { PageShell } from "../components/page-shell";
import { MetricCard } from "../components/metric-card";
import { getAppShellWorkspace } from "../lib/server-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const workspace = await getAppShellWorkspace();
  const currentRole = await getCurrentRole();
  const firstBuildingOverviewHref = workspace.firstBuildingId
    ? `/buildings/${workspace.firstBuildingId}/overview`
    : "/portfolios";
  const firstBuildingComplianceHref = workspace.firstBuildingId
    ? `/buildings/${workspace.firstBuildingId}/compliance`
    : "/portfolios";
  const firstBuildingMonitoringHref = workspace.firstBuildingId
    ? `/buildings/${workspace.firstBuildingId}/monitoring`
    : "/portfolios";

  return (
    <PageShell
      eyebrow="AirWise"
      title="Compliance and monitoring workspace"
      aside={<Badge label="Scaffold v0.1" />}
    >
      <div className="grid two">
        <MetricCard
          label="Portfolios"
          value={workspace.portfolioCount.toString()}
          detail={`${workspace.buildingCount} building records in the shared graph`}
        />
        <MetricCard
          label="Compliance"
          value="320 + 321"
          detail="Pathway-aware LL97 workspaces with generated requirements"
        />
        <MetricCard
          label="Monitoring"
          value={workspace.issueCount.toString()}
          detail="Open ventilation issues ready for operator follow-through"
        />
        <MetricCard
          label="Control Safety"
          value={workspace.pendingCommandCount.toString()}
          detail="Pending supervised commands awaiting approval"
        />
      </div>

      <div className="grid two">
        <Panel title="What this scaffold includes">
          <ul className="list">
            <li>Live SQLite-backed portfolio, building, document, monitoring, and command workspaces</li>
            <li>Coverage resolution, requirements generation, and BAS discovery actions from the web app</li>
            <li>Shared domain models and deterministic rules package</li>
            <li>API and worker apps wired for the same architecture</li>
          </ul>
        </Panel>

        <Panel title="Start here">
          <ul className="list">
            <li>
              <Link href="/portfolios">Open the portfolio view</Link>
            </li>
            <li>
              <Link href={firstBuildingOverviewHref}>Review the first building workspace</Link>
            </li>
            <li>
              <Link href={firstBuildingComplianceHref}>Open the LL97 compliance workflow</Link>
            </li>
            <li>
              <Link href={firstBuildingMonitoringHref}>Inspect the ventilation monitoring workflow</Link>
            </li>
            <li>
              <Link href="/commands">Inspect the supervised command surface</Link>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Dev role switcher">
        <form action={setDevRoleAction} style={{ display: "grid", gap: 10, maxWidth: 320 }}>
          <p className="muted" style={{ marginBottom: 0 }}>
            Current role: {currentRole}
          </p>
          <select name="role" defaultValue={currentRole}>
            {appRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit">Switch role</button>
        </form>
      </Panel>
    </PageShell>
  );
}
