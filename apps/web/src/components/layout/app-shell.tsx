import type { PropsWithChildren, ReactNode } from "react";
import { listPortfolioWorkspaces, getAppShellWorkspace } from "../../lib/server-data";
import { requireAuthenticatedSession } from "../../lib/auth";
import { commandStatusTone } from "../../lib/status";
import { ContextBar } from "./context-bar";
import { SidebarNav } from "./sidebar-nav";
import { SessionControls } from "../session-controls";

export async function AppShell({
  children,
  currentPortfolioId,
  currentBuildingId,
  reportingYear = 2026,
  buildingSection = "overview",
  header,
  kpis
}: PropsWithChildren<{
  currentPortfolioId?: string;
  currentBuildingId?: string;
  reportingYear?: number;
  buildingSection?: "overview" | "filing" | "compliance" | "documents" | "monitoring" | "recommendations";
  header?: ReactNode;
  kpis?: ReactNode;
}>) {
  const [session, portfolios, workspace] = await Promise.all([
    requireAuthenticatedSession(),
    listPortfolioWorkspaces(),
    getAppShellWorkspace()
  ]);

  const accessibleBuildings = portfolios.flatMap((portfolio) => portfolio.buildings);
  const firstBuildingId = accessibleBuildings[0]?.id;

  const portfolioOptions = portfolios.map((portfolio) => ({
    value: portfolio.id,
    label: portfolio.name,
    href: portfolio.buildings[0]
      ? `/buildings/${portfolio.buildings[0].id}/${buildingSection}`
      : "/portfolios"
  }));
  const buildingOptions = accessibleBuildings.map((building) => ({
    value: building.id,
    label: building.name,
    href: `/buildings/${building.id}/${buildingSection}`
  }));

  const navItems = [
    { href: "/portfolios", label: "Portfolios" },
    { href: firstBuildingId ? `/buildings/${firstBuildingId}/overview` : "/portfolios", label: "Buildings" },
    { href: firstBuildingId ? `/buildings/${firstBuildingId}/filing` : "/portfolios", label: "Filing" },
    { href: firstBuildingId ? `/buildings/${firstBuildingId}/compliance` : "/portfolios", label: "Compliance" },
    { href: firstBuildingId ? `/buildings/${firstBuildingId}/monitoring` : "/portfolios", label: "Monitoring" },
    {
      href: firstBuildingId ? `/buildings/${firstBuildingId}/recommendations` : "/portfolios",
      label: "Recommendations"
    },
    ...(session.activeRole === "owner" || session.activeRole === "operator"
      ? [{ href: "/commands", label: "Commands" }]
      : []),
    { href: firstBuildingId ? `/buildings/${firstBuildingId}/documents` : "/portfolios", label: "Documents" },
    ...(session.activeRole === "owner" ? [{ href: "/imports", label: "Data" }] : [])
  ];

  const globalStatusLabel =
    workspace.pendingCommandCount > 0
      ? `${workspace.pendingCommandCount} commands pending`
      : workspace.issueCount > 0
        ? `${workspace.issueCount} active issues`
        : "Stable";
  const globalStatusTone =
    workspace.pendingCommandCount > 0
      ? commandStatusTone("pending_approval")
      : workspace.issueCount > 0
        ? "warning"
        : "success";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarNav items={navItems} workspaceLabel={`${session.user.name} · ${session.activeRole ?? "member"}`} />
      <div className="lg:pl-72">
        <ContextBar
          buildingOptions={buildingOptions}
          currentBuildingId={currentBuildingId}
          currentPortfolioId={currentPortfolioId ?? session.memberships[0]?.portfolioId}
          globalStatusLabel={globalStatusLabel}
          globalStatusTone={globalStatusTone}
          portfolioOptions={portfolioOptions}
          reportingYear={reportingYear}
        />
        <main className="px-4 py-3 lg:px-context-x">
          <div className="grid gap-3">
            {header}
            {kpis}
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_16.5rem]">
              <div className="grid gap-3">{children}</div>
              <div className="hidden xl:block">
                <div className="sticky top-24">
                  <SessionControls />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
