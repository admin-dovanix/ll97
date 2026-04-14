import {
  attachDocumentEvidence,
  createDocument,
  getDocumentWorkspaceByBuildingId
} from "@airwise/database";

export function uploadDocument(buildingId: string, documentType: string, fileUrl?: string) {
  return createDocument({ buildingId, documentType, fileUrl });
}

export function getDocumentWorkspace(buildingId: string) {
  return getDocumentWorkspaceByBuildingId(buildingId);
}

export function linkDocumentEvidence(input: {
  documentId: string;
  requirementId: string;
  linkStatus: "pending_review" | "accepted" | "rejected";
  notes?: string;
}) {
  return attachDocumentEvidence(input);
}
