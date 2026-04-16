import {
  activateReportingModule,
  calculateReportingCycle,
  createOrRefreshReportingCycle,
  extractDocumentIntoReportingInputs,
  getLatestReportingCalculationRun,
  getReportingWorkspaceByBuildingId,
  getReportingWorkspaceById,
  listReportingInputFieldDefinitions,
  registerReportingDocument,
  reviewReportingInputValue,
  upsertArticle321PecmStatus,
  upsertReportingAttestation,
  upsertReportingInputValue
} from "@airwise/database";
import type {
  AttestationRole,
  FilingModuleType,
  OwnerRecordMatchStatus,
  PecmApplicability,
  PecmComplianceStatus,
  ReportingCycle,
  ReportingDocumentCategory,
  ReportingInputReviewStatus,
  ReportingWorkspace
} from "@airwise/domain";

export function createReportingCycle(buildingId: string, reportingYear: number): ReportingWorkspace {
  return createOrRefreshReportingCycle(buildingId, reportingYear);
}

export function getReportingWorkspace(buildingId: string, reportingYear: number): ReportingWorkspace {
  return getReportingWorkspaceByBuildingId(buildingId, reportingYear);
}

export function getReportingWorkspaceByCycle(cycleId: string) {
  return getReportingWorkspaceById(cycleId);
}

export function listReportingFields() {
  return listReportingInputFieldDefinitions();
}

export function uploadReportingDocument(input: {
  reportingCycleId: string;
  documentType: string;
  documentCategory: ReportingDocumentCategory;
  fileUrl?: string;
}) {
  return registerReportingDocument(input);
}

export function extractReportingDocument(documentId: string) {
  return extractDocumentIntoReportingInputs(documentId);
}

export function saveReportingInputValue(input: {
  reportingCycleId: string;
  fieldKey: string;
  value: unknown;
}) {
  return upsertReportingInputValue(input);
}

export function reviewReportingInput(input: {
  reportingCycleId: string;
  inputValueId: string;
  reviewStatus: ReportingInputReviewStatus;
}) {
  return reviewReportingInputValue(input);
}

export function activateModule(input: {
  reportingCycleId: string;
  moduleType: FilingModuleType;
}) {
  return activateReportingModule(input);
}

export function updateAttestation(input: {
  reportingCycleId: string;
  role: AttestationRole;
  signerName?: string;
  ownerOfRecordMatchStatus: OwnerRecordMatchStatus;
  completionStatus: "pending" | "completed";
}) {
  return upsertReportingAttestation(input);
}

export function updatePecm(input: {
  reportingCycleId: string;
  pecmKey: string;
  applicability: PecmApplicability;
  complianceStatus: PecmComplianceStatus;
  evidenceState: "missing" | "pending_review" | "accepted" | "rejected";
  reviewerRole?: AttestationRole;
  notes?: string;
}) {
  return upsertArticle321PecmStatus(input);
}

export function runReportingCalculation(reportingCycleId: string) {
  return calculateReportingCycle(reportingCycleId);
}

export function getLatestCalculation(reportingCycleId: string) {
  return getLatestReportingCalculationRun(reportingCycleId);
}
