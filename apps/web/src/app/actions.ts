"use server";

import { revalidatePath } from "next/cache";
import { appRoles, requireRole, setCurrentRole } from "../lib/auth";
import {
  attachDocumentEvidence,
  autoMatchPublicBuildingRecord,
  approveControlCommand,
  createControlCommand,
  createDocument,
  createPortfolio,
  createRecommendationAction,
  generateComplianceRequirements,
  ingestSensorReading,
  importBuildings,
  resolveCoverageRecord,
  startDiscoveryRun,
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

export async function createPortfolioAction(formData: FormData) {
  await requireRole(["owner"]);
  createPortfolio({
    name: requireString(formData, "name"),
    ownerName: optionalString(formData, "ownerName")
  });

  revalidatePath("/");
  revalidatePath("/portfolios");
}

export async function importBuildingAction(formData: FormData) {
  await requireRole(["owner"]);
  const articleValue = optionalString(formData, "article");
  const pathwayValue = optionalString(formData, "pathway");

  importBuildings(requireString(formData, "portfolioId"), [
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
  await requireRole(["owner", "rdp", "rcxa"]);
  const buildingId = requireString(formData, "buildingId");

  createDocument({
    buildingId,
    documentType: requireString(formData, "documentType"),
    fileUrl: optionalString(formData, "fileUrl")
  });

  revalidatePath(`/buildings/${buildingId}/documents`);
  revalidatePath(`/buildings/${buildingId}/compliance`);
}

export async function attachEvidenceAction(formData: FormData) {
  await requireRole(["owner", "rdp", "rcxa"]);
  const buildingId = requireString(formData, "buildingId");
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
  await requireRole(["owner", "operator"]);
  const target = optionalString(formData, "target");
  const [targetBuildingId, targetPointId] = target?.includes("::") ? target.split("::", 2) : [];
  const buildingId = targetBuildingId ?? requireString(formData, "buildingId");
  const pointId = targetPointId ?? requireString(formData, "pointId");

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
  await requireRole(["owner"]);
  approveControlCommand(requireString(formData, "commandId"));
  revalidatePath("/commands");
}

export async function resolveCoverageAction(formData: FormData) {
  await requireRole(["owner"]);
  const buildingId = requireString(formData, "buildingId");
  resolveCoverageRecord(buildingId, Number(optionalString(formData, "filingYear") ?? "2026"));
  revalidatePath(`/buildings/${buildingId}/overview`);
  revalidatePath(`/buildings/${buildingId}/compliance`);
  revalidatePath("/portfolios");
}

export async function generateRequirementsAction(formData: FormData) {
  await requireRole(["owner", "rdp"]);
  const buildingId = requireString(formData, "buildingId");
  generateComplianceRequirements(buildingId, Number(optionalString(formData, "reportingYear") ?? "2026"));
  revalidatePath(`/buildings/${buildingId}/compliance`);
}

export async function startDiscoveryRunAction(formData: FormData) {
  await requireRole(["owner", "operator"]);
  const buildingId = requireString(formData, "buildingId");
  startDiscoveryRun(buildingId);
  revalidatePath(`/buildings/${buildingId}/monitoring`);
  revalidatePath(`/buildings/${buildingId}/recommendations`);
  revalidatePath("/commands");
}

export async function ingestTelemetryAction(formData: FormData) {
  await requireRole(["owner", "operator"]);
  const buildingId = requireString(formData, "buildingId");
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
  await requireRole(["owner", "operator"]);
  const buildingId = requireString(formData, "buildingId");
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
  await requireRole(["owner", "operator"]);
  const buildingId = requireString(formData, "buildingId");

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
  await requireRole(["owner", "operator"]);
  const buildingId = requireString(formData, "buildingId");
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
  await requireRole(["owner"]);
  const buildingId = requireString(formData, "buildingId");
  autoMatchPublicBuildingRecord(buildingId);
  revalidatePath(`/buildings/${buildingId}/overview`);
}

export async function setDevRoleAction(formData: FormData) {
  const role = requireString(formData, "role");

  if (!appRoles.includes(role as (typeof appRoles)[number])) {
    throw new Error(`Unsupported role: ${role}`);
  }

  await setCurrentRole(role as (typeof appRoles)[number]);
  revalidatePath("/");
}
