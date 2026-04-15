import { redirect } from "next/navigation";
import { AppShell } from "../../components/layout/app-shell";
import { PageHeader } from "../../components/layout/page-header";
import { KPIStrip } from "../../components/data-display/kpi-strip";
import { ImportsWorkspace } from "../../components/data/imports-workspace";
import { StatusBadge } from "../../components/ui/status-badge";
import { requireAuthenticatedSession } from "../../lib/auth";
import { getImportReviewWorkspace } from "../../lib/server-data";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const session = await requireAuthenticatedSession();

  if (session.activeRole !== "owner") {
    redirect("/");
  }

  const workspace = await getImportReviewWorkspace(20);
  const staleDatasets = workspace.datasets.filter((dataset) => dataset.lastRunStatus !== "completed").length;
  const totalRecords = workspace.datasets.reduce((sum, dataset) => sum + dataset.recordCount, 0);
  const totalRuns = workspace.runs.length;

  return (
    <AppShell
      header={
        <PageHeader
          description="Owner-side oversight for source freshness, import success, and identity quality across public datasets."
          eyebrow="Data imports"
          status={<StatusBadge label={`${workspace.datasets.length} datasets`} tone="accent" />}
          title="Import review"
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Datasets", value: workspace.datasets.length.toString(), emphasize: true },
            { label: "Datasets at risk", value: staleDatasets.toString() },
            { label: "Tracked records", value: totalRecords.toLocaleString() },
            { label: "Recent runs", value: totalRuns.toString() }
          ]}
        />
      }
    >
      <ImportsWorkspace datasets={workspace.datasets.map((dataset) => ({ ...dataset, id: dataset.datasetName }))} runs={workspace.runs} />
    </AppShell>
  );
}
