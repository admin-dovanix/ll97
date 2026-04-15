import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { KPIStrip } from "../../components/data-display/kpi-strip";
import { CommandsWorkspace } from "../../components/commands/commands-workspace";
import { StatusBadge } from "../../components/ui/status-badge";
import { requireAuthenticatedSession } from "../../lib/auth";
import { listCommandWorkspace } from "../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function CommandsPage() {
  const session = await requireAuthenticatedSession();

  if (session.activeRole !== "owner" && session.activeRole !== "operator") {
    redirect("/");
  }

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
  const gatewayLabels = Object.fromEntries(
    workspace.buildings.flatMap((building) =>
      (workspace.gatewaysByBuilding[building.id] ?? []).map((gateway) => [gateway.id, gateway.name])
    )
  );
  const commandRows = workspace.commands.map((command) => {
    const dispatch = (workspace.dispatchesByBuilding[command.buildingId] ?? []).find(
      (item) => item.commandId === command.id
    );
    const pointLabel = pointOptions.find((option) => option.value.endsWith(`::${command.pointId}`))?.label ?? command.pointId;

    return {
      id: command.id,
      command: command.commandType,
      status: command.status,
      target: `${buildingLabels[command.buildingId] ?? command.buildingId} · ${pointLabel}`,
      requestedBy: "Not captured",
      requestedAt: command.requestedAt,
      requestedValue: command.requestedValue,
      previousValue: command.previousValue,
      expiresAt: command.expiresAt,
      executedAt: command.executedAt,
      rollbackExecutedAt: command.rollbackExecutedAt,
      executionNotes: command.executionNotes,
      dispatchStatus: dispatch?.status ?? null,
      dispatchAttempts: dispatch?.deliveryAttemptCount ?? 0,
      lastDeliveryAttemptAt: dispatch?.lastDeliveryAttemptAt ?? null,
      dispatchError: dispatch?.errorMessage ?? null,
      gatewayLabel: dispatch?.gatewayId ? gatewayLabels[dispatch.gatewayId] : null
    };
  });
  const pendingCount = commandRows.filter((row) => row.status === "pending_approval").length;
  const executedCount = commandRows.filter((row) => row.status === "executed").length;
  const failedCount = commandRows.filter((row) => row.status === "failed" || row.status === "dispatch_failed").length;

  return (
    <AppShell
      header={
        <PageHeader
          description="Trading-desk style supervision for BAS write-back requests, approvals, dispatches, and rollback safety."
          eyebrow="Commands"
          status={<StatusBadge label={`${commandRows.length} commands`} tone="accent" />}
          title="Supervised command surface"
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Requested", value: pendingCount.toString(), emphasize: true },
            { label: "Executed", value: executedCount.toString() },
            { label: "Failed", value: failedCount.toString() },
            { label: "Writable targets", value: pointOptions.length.toString() }
          ]}
        />
      }
    >
      <CommandsWorkspace canApprove={session.activeRole === "owner"} pointOptions={pointOptions} rows={commandRows} />
    </AppShell>
  );
}
