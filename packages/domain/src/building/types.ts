import type { AuditSource, EntityStatus } from "../shared/types.js";

export type CompliancePathway = "CP0" | "CP1" | "CP2" | "CP3" | "CP4" | "UNKNOWN";
export type BuildingAvailability = "yes" | "no" | "unknown";
export type BuildingBasProtocol =
  | "unknown"
  | "bacnet_ip"
  | "bacnet_mstp"
  | "modbus"
  | "proprietary"
  | "other";
export type BuildingBasAccessState =
  | "unknown"
  | "no_access"
  | "vendor_required"
  | "exports_available"
  | "direct_access_available";
export type VentilationSystemArchetype =
  | "unknown"
  | "central_exhaust"
  | "make_up_air_unit"
  | "corridor_ahu"
  | "garage_ventilation"
  | "mixed_central";
export type EquipmentInventoryStatus = "unknown" | "not_started" | "partial" | "complete";

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
  basPresent: BuildingAvailability;
  basVendor?: string;
  basProtocol: BuildingBasProtocol;
  basAccessState: BuildingBasAccessState;
  pointListAvailable: BuildingAvailability;
  schedulesAvailable: BuildingAvailability;
  ventilationSystemArchetype: VentilationSystemArchetype;
  equipmentInventoryStatus: EquipmentInventoryStatus;
  status: EntityStatus;
  source: AuditSource;
};
