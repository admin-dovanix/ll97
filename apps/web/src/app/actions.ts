"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearCurrentSession,
  loginWithEmail,
  requireActiveRole,
  requireBuildingAccess,
  requirePortfolioAccess,
  switchCurrentMembership
} from "../lib/auth";
import {
  activateReportingModule,
  attachDocumentEvidence,
  autoMatchPublicBuildingRecord,
  approveControlCommand,
  calculateReportingCycle,
  createPortfolioMembership,
  createControlCommand,
  createDocument,
  createOrRefreshReportingCycle,
  createPortfolio,
  createRecommendationAction,
  extractDocumentIntoReportingInputs,
  generateComplianceRequirements,
  getControlCommandById,
  ingestSensorReading,
  ingestBacnetGatewayDiscoverySnapshot,
  importBuildings,
  registerReportingDocument,
  replayMonitoringScenario,
  registerBacnetGateway,
  reviewReportingInputValue,
  resolveCoverageRecord,
  startDiscoveryRun,
  upsertArticle321PecmStatus,
  upsertReportingAttestation,
  upsertReportingInputValue,
  updateBacnetGatewayConfiguration,
  updateBuildingBasProfile,
  updateRecommendationActionStatus,
  updateBasPointMapping
} from "@airwise/database";

function requireString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`);
  }

  return value.trim();
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function optionalNumber(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseManualInputValue(valueText: string) {
  const trimmed = valueText.trim();

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed) ? numeric : trimmed;
}

export async function createPortfolioAction(formData: FormData) {
  const { session } = await requireActiveRole(["owner"]);
  const portfolio = createPortfolio({
    name: requireString(formData, "name"),
    ownerName: optionalString(formData, "ownerName")
  });
  const membershipId = createPortfolioMembership({
    userId: session.user.id,
    portfolioId: portfolio.id,
    role: "owner"
  });
  await switchCurrentMembership(membershipId);

  revalidatePath("/");
  revalidatePath("/portfolios");
}

export async function importBuildingAction(formData: FormData) {
  const portfolioId = requireString(formData, "portfolioId");
  await requirePortfolioAccess(portfolioId, ["owner"]);
  const articleValue = optionalString(formData, "article");
  const pathwayValue = optionalString(formData, "pathway");

  importBuildings(portfolioId, [
    {
      name: requireString(formData, "name"),
      addressLine1: requireString(formData, "addressLine1"),
      city: optionalString(formData, "city") ?? "New York",
      state: optionalString(formData, "state") ?? "NY",
      zip: optionalString(formData, "zip") ?? "00000",
      bbl: optionalString(formData, "bbl"),
      bin: optionalString(formData, "bin"),
      article: articleValue === "320" || articleValue === "321" ? articleValue : undefined,
      pathway:
        pathwayValue === "CP0" ||
        pathwayValue === "CP1" ||
        pathwayValue === "CP2" ||
        pathwayValue === "CP3" ||
        pathwayValue === "CP4"
          ? pathwayValue
          : undefined
    }
  ]);

  revalidatePath("/portfolios");
}

export async function uploadDocumentAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);

  createDocument({
    buildingId,
    documentType: requireString(formData, "documentType"),
    fileUrl: optionalString(formData, "fileUrl")
  });

  revalidatePath(`/buildings/${buildingId}/documents`);
  revalidatePath(`/buildings/${buildingId}/compliance`);
}

export async function attachEvidenceAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  const linkStatus = optionalString(formData, "linkStatus");

  attachDocumentEvidence({
    documentId: requireString(formData, "documentId"),
    requirementId: requireString(formData, "requirementId"),
    linkStatus:
      linkStatus === "accepted" || linkStatus === "rejected" || linkStatus === "pending_review"
        ? linkStatus
        : "pending_review",
    notes: optionalString(formData, "notes")
  });

  revalidatePath(`/buildings/${buildingId}/documents`);
  revalidatePath(`/buildings/${buildingId}/compliance`);
}

export async function createCommandAction(formData: FormData) {
  const target = optionalString(formData, "target");
  const [targetBuildingId, targetPointId] = target?.includes("::") ? target.split("::", 2) : [];
  const buildingId = targetBuildingId ?? requireString(formData, "buildingId");
  const pointId = targetPointId ?? requireString(formData, "pointId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);

  createControlCommand({
    buildingId,
    pointId,
    commandType: requireString(formData, "commandType"),
    requestedValue: requireString(formData, "requestedValue"),
    expiresAt: optionalString(formData, "expiresAt")
  });

  revalidatePath("/commands");
  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
}

export async function approveCommandAction(formData: FormData) {
  const commandId = requireString(formData, "commandId");
  const command = getControlCommandById(commandId);

  if (!command) {
    throw new Error(`Command ${commandId} not found.`);
  }

  await requireBuildingAccess(command.buildingId, ["owner"]);
  approveControlCommand(commandId);
  revalidatePath("/commands");
}

export async function resolveCoverageAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner"]);
  resolveCoverageRecord(buildingId, Number(optionalString(formData, "filingYear") ?? "2026"));
  revalidatePath(`/buildings/${buildingId}/overview`);
  revalidatePath(`/buildings/${buildingId}/compliance`);
  revalidatePath("/portfolios");
}

export async function updateBuildingBasProfileAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  const access = await requireBuildingAccess(buildingId, ["owner", "operator", "rdp", "rcxa"]);

  updateBuildingBasProfile({
    buildingId,
    basPresent: requireString(formData, "basPresent") as "yes" | "no" | "unknown",
    basVendor: optionalString(formData, "basVendor"),
    basProtocol: requireString(formData, "basProtocol") as
      | "unknown"
      | "bacnet_ip"
      | "bacnet_mstp"
      | "modbus"
      | "proprietary"
      | "other",
    basAccessState: requireString(formData, "basAccessState") as
      | "unknown"
      | "no_access"
      | "vendor_required"
      | "exports_available"
      | "direct_access_available",
    pointListAvailable: requireString(formData, "pointListAvailable") as "yes" | "no" | "unknown",
    schedulesAvailable: requireString(formData, "schedulesAvailable") as "yes" | "no" | "unknown",
    ventilationSystemArchetype: requireString(formData, "ventilationSystemArchetype") as
      | "unknown"
      | "central_exhaust"
      | "make_up_air_unit"
      | "corridor_ahu"
      | "garage_ventilation"
      | "mixed_central",
    equipmentInventoryStatus: requireString(formData, "equipmentInventoryStatus") as
      | "unknown"
      | "not_started"
      | "partial"
      | "complete",
    actorType: access.membership.role
  });

  revalidatePath(`/buildings/${buildingId}/overview`);
}

export async function generateRequirementsAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp"]);
  generateComplianceRequirements(buildingId, Number(optionalString(formData, "reportingYear") ?? "2026"));
  revalidatePath(`/buildings/${buildingId}/compliance`);
}

export async function createReportingCycleAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  createOrRefreshReportingCycle(buildingId, Number(optionalString(formData, "reportingYear") ?? "2026"));
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function uploadReportingDocumentAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  registerReportingDocument({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    documentType: requireString(formData, "documentType"),
    documentCategory: requireString(formData, "documentCategory") as
      | "espm_export"
      | "utility_bill"
      | "prior_ll97_report"
      | "engineering_report"
      | "owner_attestation",
    fileUrl: optionalString(formData, "fileUrl")
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function extractReportingDocumentAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  extractDocumentIntoReportingInputs(requireString(formData, "documentId"));
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function saveReportingInputValueAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  upsertReportingInputValue({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    fieldKey: requireString(formData, "fieldKey"),
    value: parseManualInputValue(requireString(formData, "valueText"))
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function reviewReportingInputValueAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  reviewReportingInputValue({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    inputValueId: requireString(formData, "inputValueId"),
    reviewStatus: requireString(formData, "reviewStatus") as "pending_review" | "accepted" | "rejected"
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function activateReportingModuleAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp"]);
  activateReportingModule({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    moduleType: requireString(formData, "moduleType") as
      | "extension"
      | "article_320_report"
      | "article_321_report"
      | "deductions"
      | "adjustment_320_7"
      | "adjustment_320_8_320_9"
      | "penalty_mitigation"
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function calculateReportingCycleAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  calculateReportingCycle(requireString(formData, "reportingCycleId"));
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function updateReportingAttestationAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  upsertReportingAttestation({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    role: requireString(formData, "role") as "owner" | "rdp" | "rcxa",
    signerName: optionalString(formData, "signerName"),
    ownerOfRecordMatchStatus: requireString(formData, "ownerOfRecordMatchStatus") as "unknown" | "matched" | "mismatch",
    completionStatus: requireString(formData, "completionStatus") as "pending" | "completed"
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function updateArticle321PecmAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "rdp", "rcxa"]);
  upsertArticle321PecmStatus({
    reportingCycleId: requireString(formData, "reportingCycleId"),
    pecmKey: requireString(formData, "pecmKey"),
    applicability: requireString(formData, "applicability") as "required" | "not_applicable" | "unknown",
    complianceStatus: requireString(formData, "complianceStatus") as
      | "in_compliance"
      | "not_in_compliance"
      | "not_applicable"
      | "unknown",
    evidenceState: requireString(formData, "evidenceState") as "missing" | "pending_review" | "accepted" | "rejected",
    reviewerRole: requireString(formData, "reviewerRole") as "owner" | "rdp" | "rcxa",
    notes: optionalString(formData, "notes")
  });
  revalidatePath(`/buildings/${buildingId}/filing`);
}

export async function startDiscoveryRunAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);
  startDiscoveryRun(buildingId);
  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath("/commands");
}

export async function registerBacnetGatewayAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);

  registerBacnetGateway({
    buildingId,
    name: requireString(formData, "name"),
    protocol: optionalString(formData, "protocol"),
    vendor: optionalString(formData, "vendor"),
    host: optionalString(formData, "host"),
    port: optionalNumber(formData, "port"),
    authType: optionalString(formData, "authType"),
    runtimeMode: optionalString(formData, "runtimeMode"),
    commandEndpoint: optionalString(formData, "commandEndpoint"),
    pollIntervalSeconds: optionalNumber(formData, "pollIntervalSeconds")
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
}

export async function updateGatewayConfigAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);

  updateBacnetGatewayConfiguration({
    gatewayId: requireString(formData, "gatewayId"),
    bridgeBackend: optionalString(formData, "bridgeBackend"),
    sdkModulePath: optionalString(formData, "sdkModulePath"),
    sdkExportName: optionalString(formData, "sdkExportName"),
    sdkConfigJson: optionalString(formData, "sdkConfigJson"),
    dispatchTimeoutSeconds: optionalNumber(formData, "dispatchTimeoutSeconds"),
    maxDispatchAttempts: optionalNumber(formData, "maxDispatchAttempts")
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath("/commands");
}

export async function ingestGatewaySnapshotAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);
  const snapshotRaw = requireString(formData, "snapshotJson");

  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotRaw);
  } catch {
    throw new Error("Snapshot JSON could not be parsed.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Snapshot JSON must be an object.");
  }

  const snapshot = parsed as {
    gatewayId?: string;
    gateway?: {
      name?: string;
      protocol?: string;
      vendor?: string;
      host?: string;
      port?: number;
      authType?: string;
      metadataJson?: string;
    };
    observedAt?: string;
    assets?: Array<{
      assetKey?: string;
      systemName: string;
      assetType?: string;
      protocol?: string;
      vendor?: string;
      location?: string;
      status?: string;
      metadata?: Record<string, unknown>;
      points: Array<{
        pointKey?: string;
        objectIdentifier: string;
        objectName: string;
        canonicalPointType?: string;
        unit?: string;
        isWritable?: boolean;
        isWhitelisted?: boolean;
        safetyCategory?: string;
        presentValue?: string | number;
        qualityFlag?: string;
        metadata?: Record<string, unknown>;
      }>;
    }>;
  };

  if (!Array.isArray(snapshot.assets) || snapshot.assets.length === 0) {
    throw new Error("Snapshot JSON must include a non-empty assets array.");
  }

  ingestBacnetGatewayDiscoverySnapshot({
    buildingId,
    gatewayId: snapshot.gatewayId,
    gateway: snapshot.gateway,
    observedAt: snapshot.observedAt,
    assets: snapshot.assets
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath("/commands");
}

export async function replayMonitoringScenarioAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);

  replayMonitoringScenario({
    buildingId,
    gatewayId: optionalString(formData, "gatewayId"),
    scenario: optionalString(formData, "scenario"),
    observedAt: optionalString(formData, "observedAt")
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath("/commands");
}

export async function ingestTelemetryAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);
  const rawValue = requireString(formData, "value");
  const numericValue = Number(rawValue);

  ingestSensorReading({
    buildingId,
    pointId: requireString(formData, "pointId"),
    systemId: optionalString(formData, "systemId"),
    value: Number.isFinite(numericValue) && rawValue.trim() !== "" ? numericValue : rawValue,
    unit: optionalString(formData, "unit"),
    qualityFlag: optionalString(formData, "qualityFlag") ?? "ok",
    timestamp: optionalString(formData, "timestamp") ?? new Date().toISOString()
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
}

export async function updateBasPointAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);
  const whitelisted = optionalString(formData, "isWhitelisted");

  updateBasPointMapping({
    pointId: requireString(formData, "pointId"),
    canonicalPointType: optionalString(formData, "canonicalPointType"),
    isWhitelisted: whitelisted === "true",
    safetyCategory: optionalString(formData, "safetyCategory")
  });

  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath("/commands");
}

export async function createRecommendationActionAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);

  createRecommendationAction({
    recommendationId: requireString(formData, "recommendationId"),
    actionType: requireString(formData, "actionType"),
    assignee: optionalString(formData, "assignee"),
    notes: optionalString(formData, "notes")
  });

  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath(`/buildings/${buildingId}/monitoring`);
}

export async function updateRecommendationActionStatusAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner", "operator"]);
  const actionStatus = requireString(formData, "actionStatus");

  updateRecommendationActionStatus({
    actionId: requireString(formData, "actionId"),
    actionStatus:
      actionStatus === "proposed" ||
      actionStatus === "in_progress" ||
      actionStatus === "completed" ||
      actionStatus === "cancelled"
        ? actionStatus
        : "proposed",
    notes: optionalString(formData, "notes")
  });

  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath(`/buildings/${buildingId}/monitoring`);
}

export async function autoMatchPublicRecordAction(formData: FormData) {
  const buildingId = requireString(formData, "buildingId");
  await requireBuildingAccess(buildingId, ["owner"]);
  autoMatchPublicBuildingRecord(buildingId);
  revalidatePath(`/buildings/${buildingId}/overview`);
}

export async function loginAction(formData: FormData) {
  const email = requireString(formData, "email");
  const membershipId = optionalString(formData, "membershipId");

  await loginWithEmail(email, membershipId);
  revalidatePath("/");
  redirect("/");
}

export async function switchMembershipAction(formData: FormData) {
  await switchCurrentMembership(requireString(formData, "membershipId"));
  revalidatePath("/");
  redirect("/");
}

export async function logoutAction() {
  await clearCurrentSession();
  revalidatePath("/");
  redirect("/login");
}
