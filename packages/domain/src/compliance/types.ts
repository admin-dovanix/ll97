import type { CompliancePathway } from "../building/types.js";

export type ComplianceRequirementType =
  | "coverage_verification"
  | "pathway_verification"
  | "article_320_emissions_report"
  | "article_321_performance_report"
  | "article_321_prescriptive_report"
  | "attestation_rdp"
  | "attestation_rcxa";

export type EvidenceLinkStatus = "pending_review" | "accepted" | "rejected";

export type ComplianceRequirement = {
  id: string;
  buildingId: string;
  reportingYear: number;
  type: ComplianceRequirementType;
  status: "not_started" | "in_progress" | "blocked" | "complete";
  dueDate: string;
  requiredRole: "owner" | "rdp" | "rcxa" | "operator";
  blockingReason?: string;
  evidenceLinkCount?: number;
  acceptedEvidenceCount?: number;
  rejectedEvidenceCount?: number;
  pendingEvidenceCount?: number;
  evidenceState?: "missing" | "pending_review" | "accepted" | "rejected";
};

export type BuildingComplianceSummary = {
  buildingId: string;
  pathway: CompliancePathway;
  article: "320" | "321";
  requirements: ComplianceRequirement[];
  blockerCount: number;
  evidenceGapCount: number;
  readyRequirementCount: number;
  estimatedLateReportPenalty: number | null;
  estimatedEmissionsOverLimitPenalty: number | null;
};
