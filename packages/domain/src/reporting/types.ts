import type { AuditActorType } from "../shared/types.js";
import type { CompliancePathway } from "../building/types.js";

export type ReportingCycleStatus = "draft" | "in_progress" | "blocked" | "ready";
export type ReportingPackageStatus = "draft" | "review_required" | "approved_for_calc" | "locked";
export type ReportingInputReviewStatus = "pending_review" | "accepted" | "rejected";
export type ReportingInputSourceType = "manual" | "document_extraction" | "carryforward" | "public_record";
export type FilingModuleType =
  | "extension"
  | "article_320_report"
  | "article_321_report"
  | "deductions"
  | "adjustment_320_7"
  | "adjustment_320_8_320_9"
  | "penalty_mitigation";
export type FilingModuleStatus = "inactive" | "active" | "blocked" | "complete";
export type ReportingDocumentCategory =
  | "espm_export"
  | "utility_bill"
  | "prior_ll97_report"
  | "engineering_report"
  | "owner_attestation";
export type ReportingDocumentParsedStatus = "not_started" | "parsed" | "review_required" | "failed";
export type AttestationRole = "owner" | "rdp" | "rcxa";
export type AttestationStatus = "pending" | "completed" | "blocked";
export type OwnerRecordMatchStatus = "unknown" | "matched" | "mismatch";
export type Article321PathwayMode = "performance" | "prescriptive";
export type PecmApplicability = "required" | "not_applicable" | "unknown";
export type PecmComplianceStatus = "in_compliance" | "not_in_compliance" | "not_applicable" | "unknown";

export type ReportingInputFieldFamily =
  | "identity"
  | "coverage"
  | "espm"
  | "area"
  | "energy"
  | "workflow"
  | "extension"
  | "deductions"
  | "adjustment_320_7"
  | "adjustment_320_8_320_9"
  | "mitigation";

export type ReportingCycle = {
  id: string;
  buildingId: string;
  reportingYear: number;
  filingStatus: ReportingCycleStatus;
  extensionRequested: boolean;
  filingDueDate: string;
  extendedDueDate?: string;
  pathwaySnapshot: CompliancePathway;
  articleSnapshot: "320" | "321" | "UNKNOWN";
  cblVersion?: string;
  cblDisputeStatus?: string;
  ownerOfRecordStatus: OwnerRecordMatchStatus;
};

export type ReportingInputPackage = {
  id: string;
  reportingCycleId: string;
  status: ReportingPackageStatus;
};

export type ReportingInputValue = {
  id: string;
  packageId: string;
  fieldKey: string;
  fieldFamily: ReportingInputFieldFamily;
  valueJson: string;
  sourceType: ReportingInputSourceType;
  sourceRef?: string;
  confidenceScore?: number;
  reviewStatus: ReportingInputReviewStatus;
  reviewedBy?: AuditActorType;
  reviewedAt?: string;
};

export type ReportingDocument = {
  id: string;
  buildingId: string;
  reportingYear?: number;
  documentType: string;
  documentCategory: ReportingDocumentCategory;
  fileUrl: string;
  classificationConfidence?: number;
  status: string;
  parsedStatus: ReportingDocumentParsedStatus;
  parserType?: string;
  parserVersion?: string;
};

export type DocumentExtraction = {
  id: string;
  documentId: string;
  fieldKey: string;
  valueJson: string;
  confidenceScore: number;
  pageRef?: string;
  extractionMethod: string;
};

export type FilingModule = {
  id: string;
  reportingCycleId: string;
  moduleType: FilingModuleType;
  status: FilingModuleStatus;
  dueDate: string;
  prerequisiteState: string;
  blockingReason?: string;
};

export type FilingAttestation = {
  id: string;
  reportingCycleId: string;
  role: AttestationRole;
  signerName?: string;
  ownerOfRecordMatchStatus: OwnerRecordMatchStatus;
  completionStatus: AttestationStatus;
  completedAt?: string;
};

export type Article321PecmStatus = {
  id: string;
  reportingCycleId: string;
  pecmKey: string;
  pecmLabel: string;
  applicability: PecmApplicability;
  complianceStatus: PecmComplianceStatus;
  evidenceState: "missing" | "pending_review" | "accepted" | "rejected";
  reviewerRole: AttestationRole;
  notes?: string;
};

export type CalculationRun = {
  id: string;
  reportingCycleId: string;
  calculationVersion: string;
  missingRequiredInputs: string[];
  needsReview: string[];
  warnings: string[];
  calculationOutputs: Record<string, unknown>;
  createdAt: string;
};

export type ReportingWorkspace = {
  cycle: ReportingCycle;
  inputPackage: ReportingInputPackage;
  modules: FilingModule[];
  documents: ReportingDocument[];
  inputValues: ReportingInputValue[];
  extractions: DocumentExtraction[];
  attestations: FilingAttestation[];
  pecmStatuses: Article321PecmStatus[];
  latestCalculationRun?: CalculationRun;
  requiredFieldKeys: string[];
  blockers: string[];
};
