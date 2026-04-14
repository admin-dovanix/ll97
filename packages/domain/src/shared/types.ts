export type SourceType = "public" | "owner" | "consultant" | "inferred";
export type AuditActorType = "system" | "owner" | "operator" | "rdp" | "rcxa";

export type AuditEvent = {
  id: string;
  buildingId?: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: AuditActorType;
  summary: string;
  metadataJson?: string;
  createdAt: string;
};

export type AuditSource = {
  sourceType: SourceType;
  sourceRef: string;
  sourceVersion?: string;
  confidenceScore?: number;
};

export type EntityStatus = "draft" | "active" | "blocked" | "archived";
