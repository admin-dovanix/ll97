import type { AuditSource, EntityStatus } from "../shared/types.js";

export type CompliancePathway = "CP0" | "CP1" | "CP2" | "CP3" | "CP4" | "UNKNOWN";

export type Building = {
  id: string;
  portfolioId: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  bbl?: string;
  bin?: string;
  grossSquareFeet?: number;
  grossFloorArea?: number;
  pathway: CompliancePathway;
  article: "320" | "321" | "UNKNOWN";
  status: EntityStatus;
  source: AuditSource;
};
