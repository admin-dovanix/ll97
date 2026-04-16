import { notFound } from "next/navigation";
import { canonicalPointTypes } from "@airwise/rules";
import { AppShell } from "../../../../components/layout/app-shell";
import { PageHeader } from "../../../../components/layout/page-header";
import { KPIStrip } from "../../../../components/data-display/kpi-strip";
import { MonitoringWorkspace } from "../../../../components/monitoring/monitoring-workspace";
import { StatusBadge } from "../../../../components/ui/status-badge";
import { WorkflowStoryCard } from "../../../../components/workflow-story-card";
import {
  getBuildingComplianceWorkspace,
  getBuildingMonitoringWorkspace,
  getBuildingReportingWorkspace,
  getBuildingWorkspace
} from "../../../../lib/server-data";

export const dynamic = "force-dynamic";

function parseObject(value?: string | null) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export default async function MonitoringPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [building, monitoring, compliance, filing] = await Promise.all([
    getBuildingWorkspace(id).catch(() => null),
    getBuildingMonitoringWorkspace(id).catch(() => null),
    getBuildingComplianceWorkspace(id).catch(() => null),
    getBuildingReportingWorkspace(id, 2026).catch(() => null)
  ]);

  if (!building || !monitoring || !compliance || !filing) {
    notFound();
  }

  const { gateways, assets, discoveryRuns, issues, basPoints, telemetryEvents, dispatches } = monitoring;

  return (
    <AppShell
      buildingSection="monitoring"
      currentBuildingId={building.id}
      currentPortfolioId={building.portfolioId}
      header={
        <PageHeader
          description="Operational monitoring centers the queue of active issues while keeping discovery, telemetry, and point governance within reach."
          eyebrow="Monitoring"
          status={<StatusBadge label={`${assets.length} systems`} tone="accent" />}
          title={`HVAC monitoring for ${building.name}`}
        />
      }
      kpis={
        <KPIStrip
          items={[
            { label: "Active issues", value: issues.length.toString(), emphasize: true },
            { label: "Gateways", value: gateways.length.toString() },
            { label: "Discovered points", value: basPoints.length.toString() },
            { label: "Telemetry events", value: telemetryEvents.length.toString() }
          ]}
        />
      }
    >
      <WorkflowStoryCard
        badges={[
          { label: `${issues.length} active issues`, tone: issues.length > 0 ? "warning" : "success" },
          { label: `${compliance.evidenceGapCount} evidence gaps`, tone: compliance.evidenceGapCount > 0 ? "warning" : "neutral" },
          { label: filing.cycle.filingStatus.replaceAll("_", " "), tone: filing.cycle.filingStatus === "ready" ? "success" : "warning" }
        ]}
        description="Monitoring is not a separate product island. Runtime issues can drive energy waste, change emissions outcomes, and determine what the team should fix before the next filing cycle."
        links={[
          { label: "Impact on compliance", href: `/buildings/${building.id}/compliance` },
          { label: "Open filing workspace", href: `/buildings/${building.id}/filing`, variant: "secondary" }
        ]}
        title="Impact on compliance and emissions"
      />

      <MonitoringWorkspace
        buildingId={building.id}
        gateways={gateways.map((gateway) => {
          const metadata = parseObject(gateway.metadataJson);
          const validation =
            metadata.configValidation && typeof metadata.configValidation === "object"
              ? (metadata.configValidation as Record<string, unknown>)
              : {};
          const validationSummary =
            validation.summary && typeof validation.summary === "object"
              ? (validation.summary as Record<string, unknown>)
              : {};
          const dispatchPolicy =
            metadata.dispatchPolicy && typeof metadata.dispatchPolicy === "object"
              ? (metadata.dispatchPolicy as Record<string, unknown>)
              : {};
          const replayProfile =
            metadata.replayProfile && typeof metadata.replayProfile === "object"
              ? (metadata.replayProfile as Record<string, unknown>)
              : {};

          return {
            id: gateway.id,
            name: gateway.name,
            status: gateway.status,
            protocol: gateway.protocol,
            host: gateway.host,
            port: gateway.port,
            vendor: gateway.vendor,
            runtimeMode: gateway.runtimeMode ?? "outbox",
            lastSeenAt: gateway.lastSeenAt,
            heartbeatStatus: gateway.heartbeatStatus,
            ingestToken: gateway.ingestToken,
            commandEndpoint: gateway.commandEndpoint,
            pollIntervalSeconds: gateway.pollIntervalSeconds,
            lastPollRequestedAt: gateway.lastPollRequestedAt,
            lastPollCompletedAt: gateway.lastPollCompletedAt,
            nextPollDueAt: gateway.nextPollDueAt,
            bridgeBackend: typeof metadata.bridgeBackend === "string" ? metadata.bridgeBackend : "bacnet-sdk",
            sdkModulePath: typeof metadata.sdkModulePath === "string" ? metadata.sdkModulePath : "",
            sdkExportName: typeof metadata.sdkExportName === "string" ? metadata.sdkExportName : "createBacnetSdkProvider",
            sdkConfigJson: typeof metadata.sdkConfigJson === "string" ? metadata.sdkConfigJson : "",
            validationStatus: typeof validation.status === "string" ? validation.status : "unknown",
            validationIssues: Array.isArray(validation.issues) ? validation.issues.map(String) : [],
            validationWarnings: Array.isArray(validation.warnings) ? validation.warnings.map(String) : [],
            validationPointCount:
              typeof validationSummary.pointCount === "number" ? validationSummary.pointCount : undefined,
            validationWritablePointCount:
              typeof validationSummary.writablePointCount === "number"
                ? validationSummary.writablePointCount
                : undefined,
            validationWhitelistedPointCount:
              typeof validationSummary.whitelistedPointCount === "number"
                ? validationSummary.whitelistedPointCount
                : undefined,
            dispatchTimeoutSeconds:
              typeof dispatchPolicy.timeoutSeconds === "number" ? dispatchPolicy.timeoutSeconds : undefined,
            maxDispatchAttempts:
              typeof dispatchPolicy.maxAttempts === "number" ? dispatchPolicy.maxAttempts : undefined,
            lastReplayScenario: typeof replayProfile.lastScenario === "string" ? replayProfile.lastScenario : undefined,
            lastReplayAt: typeof replayProfile.lastReplayAt === "string" ? replayProfile.lastReplayAt : undefined
          };
        })}
        issues={issues.map((issue) => ({
          id: issue.id,
          issue: issue.issueType.replaceAll("_", " "),
          severity: issue.confidenceScore >= 0.9 ? "high" : issue.confidenceScore >= 0.75 ? "medium" : "low",
          system: issue.systemId ?? "Building scope",
          impact: issue.writebackEligible ? "Control intervention available" : "Operator investigation",
          action: issue.recommendedAction ?? "Review telemetry",
          summary: issue.summary,
          evidenceWindow: issue.evidenceWindow,
          confidenceScore: issue.confidenceScore,
          writebackEligible: issue.writebackEligible
        }))}
        pointTypeOptions={canonicalPointTypes}
        points={basPoints.map((point) => ({
          id: point.id,
          objectName: point.objectName,
          objectIdentifier: point.objectIdentifier,
          canonicalPointType: point.canonicalPointType,
          isWritable: point.isWritable,
          isWhitelisted: point.isWhitelisted,
          safetyCategory: point.safetyCategory
        }))}
        systems={assets.map((asset) => ({
          id: asset.id,
          systemName: asset.systemName,
          assetType: asset.assetType,
          location: asset.location ?? "Unknown",
          status: asset.status,
          sourceGateway: asset.sourceGatewayId ?? "local"
        }))}
        telemetry={telemetryEvents.map((event) => ({
          id: event.id,
          pointLabel: event.pointId ?? "Unknown point",
          timestamp: event.timestamp,
          unit: event.unit ?? "unitless",
          quality: event.qualityFlag ?? "ok",
          value: String(event.valueNumeric ?? event.valueText ?? "n/a")
        }))}
        dispatches={dispatches.map((dispatch) => ({
          id: dispatch.id,
          gatewayId: dispatch.gatewayId,
          status: dispatch.status,
          commandId: dispatch.commandId,
          pointId: dispatch.pointId,
          createdAt: dispatch.createdAt,
          dispatchedAt: dispatch.dispatchedAt,
          acknowledgedAt: dispatch.acknowledgedAt,
          deliveryAttemptCount: dispatch.deliveryAttemptCount,
          errorMessage: dispatch.errorMessage
        }))}
      />
    </AppShell>
  );
}
