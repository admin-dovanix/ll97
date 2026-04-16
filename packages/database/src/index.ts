import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type {
  Article321PecmStatus,
  Article321PathwayMode,
  AttestationRole,
  CalculationRun,
  DocumentExtraction,
  AuditActorType,
  AuditEvent,
  BeforeAfterSummary,
  Building,
  BuildingAvailability,
  BuildingBasAccessState,
  BuildingBasProtocol,
  BuildingComplianceSummary,
  CompliancePathway,
  ComplianceRequirement,
  EquipmentInventoryStatus,
  EvidenceLinkStatus,
  FilingAttestation,
  FilingModule,
  FilingModuleStatus,
  FilingModuleType,
  MonitoringPointType,
  MonitoringIssue,
  OwnerRecordMatchStatus,
  PecmApplicability,
  PecmComplianceStatus,
  RecommendationAction,
  RecommendationActionStatus,
  ReportingCycle,
  ReportingCycleStatus,
  ReportingDocument,
  ReportingDocumentCategory,
  ReportingDocumentParsedStatus,
  ReportingInputFieldFamily,
  ReportingInputPackage,
  ReportingInputReviewStatus,
  ReportingInputSourceType,
  ReportingInputValue,
  ReportingPackageStatus,
  ReportingWorkspace,
  VentilationSystemArchetype
} from "@airwise/domain";
import {
  calculateEmissionsPenalty,
  calculateLateReportPenalty,
  canonicalPointTypes,
  pecmCatalog,
  pathwayMetadata,
  writablePointTypes
} from "@airwise/rules";

export const initialMigrations = [
  "0001_initial.sql",
  "0002_audit_events.sql",
  "0003_recommendation_actions.sql",
  "0004_public_building_records.sql",
  "0005_command_lifecycle.sql",
  "0006_public_import_runs.sql",
  "0007_auth_sessions.sql",
  "0008_bacnet_gateways.sql",
  "0009_gateway_runtime.sql",
  "0010_gateway_runtime_health.sql",
  "0011_building_bas_profile.sql",
  "0012_reporting_cycles.sql"
] as const;

export const seedFiles = ["ll97-config.json"] as const;

type SeedConfig = {
  filingDeadlines: Array<{
    requirementType: string;
    dueDate: string;
  }>;
  penalties: {
    lateReportPenaltyPerSqFtPerMonth: number;
    emissionsOverLimitPenaltyPerTco2e: number;
  };
  coverageConfidence: {
    matchedBbl: number;
    matchedBin: number;
    matchedAddress: number;
    ownerImported: number;
    conflictPenalty: number;
  };
  emissionsEstimates: {
    article320: {
      estimatedActualTco2ePerSqFt: number;
      estimatedLimitTco2ePerSqFt: number;
    };
  };
  requirementTemplates: {
    article320: RequirementTemplate[];
    article321Prescriptive: RequirementTemplate[];
    article321Performance: RequirementTemplate[];
  };
};

type RequirementTemplate = {
  type: ComplianceRequirement["type"];
  status: ComplianceRequirement["status"];
  requiredRole: ComplianceRequirement["requiredRole"];
  dueDateRef: string;
  blockingReason?: string;
};

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(packageRoot, "../../..");
const dataDir = join(repoRoot, ".airwise-data");
const dbPath = join(dataDir, "airwise.db");
const seedPath = join(repoRoot, "packages/database/seeds/ll97-config.json");

let dbInstance: DatabaseSync | null = null;

export function getDatabasePath() {
  return dbPath;
}

function readSeedConfig(): SeedConfig {
  const raw = readFileSync(seedPath, "utf8");
  return JSON.parse(raw) as SeedConfig;
}

function getMigrationPath(migrationId: (typeof initialMigrations)[number]) {
  return join(repoRoot, "packages/database/migrations", migrationId);
}

function seedInitialData(db: DatabaseSync) {
  const portfolioCount = Number(
    db.prepare("SELECT COUNT(*) as count FROM portfolios").get()?.count ?? 0
  );

  if (portfolioCount > 0) {
    return;
  }

  db.prepare(
    `INSERT INTO portfolios (id, name, owner_name, timezone, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run("pf_001", "Central Brooklyn Pilot", "AirWise Design Partner", "America/New_York", "active");

  db.prepare(
    `INSERT INTO buildings (
      id, portfolio_id, name, address_line_1, city, state, zip, bbl, bin, dof_gsf, reported_gfa, article, pathway
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "bld_001",
    "pf_001",
    "Prospect Commons",
    "215 Prospect Place",
    "Brooklyn",
    "NY",
    "11238",
    "3001230042",
    "3332221",
    128000,
    121500,
    "321",
    "CP3"
  );

  db.prepare(
    `INSERT INTO coverage_records (
      id, building_id, filing_year, covered_status, compliance_pathway, pathway_tier, source_name, source_version, source_date, is_disputed, confidence_score, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "cov_001",
    "bld_001",
    2026,
    "covered",
    "CP3",
    "CP3",
    "DOB covered buildings list",
    "2026",
    "2026-01-01",
    0,
    0.93,
    "Seeded sample pilot building."
  );

  db.prepare(
    `INSERT INTO public_building_records (
      id, dataset_name, source_version, source_record_key, normalized_address_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "pub_001",
    "dob_covered_buildings",
    "2026",
    "3001230042|3332221|215 PROSPECT PLACE|BROOKLYN|NY|11238",
    "215 PROSPECT PLACE|BROOKLYN|NY|11238",
    "215 Prospect Place",
    "Brooklyn",
    "NY",
    "11238",
    "3001230042",
    "3332221",
    "covered",
    "CP3",
    "321",
    128000,
    JSON.stringify({ source: "seed", notes: "Sample public-source candidate for demo matching." })
  );

  db.prepare(
    `INSERT INTO monitoring_assets (id, building_id, system_name, asset_type, protocol, vendor, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "asset_001",
    "bld_001",
    "Garage Exhaust System",
    "fan_system",
    "BACnet/IP",
    "Pilot BAS",
    "Garage",
    "active"
  );

  db.prepare(
    `INSERT INTO bas_points (
      id, monitoring_asset_id, object_identifier, object_name, canonical_point_type, unit, is_writable, is_whitelisted, safety_category, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "point_001",
    "asset_001",
    "analog-output,1",
    "Garage Exhaust Occupancy Mode",
    "occupancy_mode",
    "enum",
    1,
    1,
    "operational",
    JSON.stringify({ writableByPilot: true })
  );

  db.prepare(
    `INSERT INTO recommendations (
      id, building_id, system_id, issue_type, summary, evidence_json, recommended_action, writeback_eligible, confidence_score, status, assigned_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "rec_001",
    "bld_001",
    "asset_001",
    "after_hours_runtime",
    "Garage exhaust fan is running overnight outside the expected schedule.",
    JSON.stringify({ evidenceWindow: "2026-04-08 to 2026-04-13" }),
    "Review schedule and prepare supervised command for the occupancy mode point.",
    1,
    0.91,
    "open",
    "operator"
  );
}

function reconcileSeedData(db: DatabaseSync) {
  const config = readSeedConfig();
  const sampleBuilding = db
    .prepare(`SELECT id, article FROM buildings WHERE id = ?`)
    .get("bld_001") as { id: string; article: string | null } | undefined;

  if (!sampleBuilding) {
    return;
  }

  const upsertRequirement = db.prepare(
    `INSERT INTO compliance_requirements (
      id, building_id, reporting_year, requirement_type, status, due_date, required_role, blocking_reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      reporting_year = excluded.reporting_year,
      requirement_type = excluded.requirement_type,
      status = excluded.status,
      due_date = excluded.due_date,
      required_role = excluded.required_role,
      blocking_reason = excluded.blocking_reason`
  );

  upsertRequirement.run(
    "req_cov_001",
    sampleBuilding.id,
    2026,
    "coverage_verification",
    "complete",
    config.filingDeadlines[0]?.dueDate ?? "2026-05-01",
    "owner",
    null
  );

  db.prepare(
    `UPDATE buildings
     SET
       bas_present = COALESCE(NULLIF(bas_present, ''), 'yes'),
       bas_vendor = COALESCE(bas_vendor, 'Pilot BAS'),
       bas_protocol = COALESCE(NULLIF(bas_protocol, ''), 'bacnet_ip'),
       bas_access_state = COALESCE(NULLIF(bas_access_state, ''), 'exports_available'),
       point_list_available = COALESCE(NULLIF(point_list_available, ''), 'yes'),
       schedules_available = COALESCE(NULLIF(schedules_available, ''), 'yes'),
       ventilation_system_archetype = COALESCE(NULLIF(ventilation_system_archetype, ''), 'garage_ventilation'),
       equipment_inventory_status = COALESCE(NULLIF(equipment_inventory_status, ''), 'partial')
     WHERE id = ?`
  ).run(sampleBuilding.id);

  if (sampleBuilding.article === "321") {
    upsertRequirement.run(
      "req_321_prescriptive_001",
      sampleBuilding.id,
      2026,
      "article_321_prescriptive_report",
      "in_progress",
      config.filingDeadlines.find((item) => item.requirementType === "article_321_performance_report")?.dueDate ??
        "2026-05-01",
      "owner",
      null
    );

    upsertRequirement.run(
      "req_rcxa_001",
      sampleBuilding.id,
      2026,
      "attestation_rcxa",
      "blocked",
      config.filingDeadlines.find((item) => item.requirementType === "article_321_performance_report")?.dueDate ??
        "2026-05-01",
      "rcxa",
      "Awaiting PECM evidence package and RCxA sign-off."
    );
  } else {
    upsertRequirement.run(
      "req_320_001",
      sampleBuilding.id,
      2026,
      "article_320_emissions_report",
      "in_progress",
      config.filingDeadlines.find((item) => item.requirementType === "article_320_emissions_report")?.dueDate ??
        "2026-05-01",
      "rdp",
      null
    );

    upsertRequirement.run(
      "req_rdp_001",
      sampleBuilding.id,
      2026,
      "attestation_rdp",
      "blocked",
      config.filingDeadlines.find((item) => item.requirementType === "article_320_emissions_report")?.dueDate ??
        "2026-05-01",
      "rdp",
      "Awaiting reviewed utility and GFA package."
    );
  }

  const samplePublicRecord = db
    .prepare(`SELECT id FROM public_building_records WHERE id = ?`)
    .get("pub_001") as { id: string } | undefined;

  if (!samplePublicRecord) {
    db.prepare(
      `INSERT INTO public_building_records (
        id, dataset_name, source_version, source_record_key, normalized_address_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "pub_001",
      "dob_covered_buildings",
      "2026",
      "3001230042|3332221|215 PROSPECT PLACE|BROOKLYN|NY|11238",
      "215 PROSPECT PLACE|BROOKLYN|NY|11238",
      "215 Prospect Place",
      "Brooklyn",
      "NY",
      "11238",
      "3001230042",
      "3332221",
      "covered",
      "CP3",
      "321",
      128000,
      JSON.stringify({ source: "seed", notes: "Sample public-source candidate for demo matching." })
    );
  } else {
    db.prepare(
      `UPDATE public_building_records
       SET source_record_key = COALESCE(source_record_key, ?),
           normalized_address_key = COALESCE(normalized_address_key, ?)
       WHERE id = ?`
    ).run(
      "3001230042|3332221|215 PROSPECT PLACE|BROOKLYN|NY|11238",
      "215 PROSPECT PLACE|BROOKLYN|NY|11238",
      "pub_001"
    );
  }

  const seededUsers = [
    {
      userId: "user_owner_001",
      membershipId: "membership_owner_001",
      name: "Maya Owner",
      email: "owner@airwise.local",
      role: "owner"
    },
    {
      userId: "user_operator_001",
      membershipId: "membership_operator_001",
      name: "Owen Operator",
      email: "operator@airwise.local",
      role: "operator"
    },
    {
      userId: "user_rdp_001",
      membershipId: "membership_rdp_001",
      name: "Riley RDP",
      email: "rdp@airwise.local",
      role: "rdp"
    },
    {
      userId: "user_rcxa_001",
      membershipId: "membership_rcxa_001",
      name: "Casey RCxA",
      email: "rcxa@airwise.local",
      role: "rcxa"
    }
  ] as const satisfies Array<{
    userId: string;
    membershipId: string;
    name: string;
    email: string;
    role: AppUserRole;
  }>;

  const upsertUser = db.prepare(
    `INSERT INTO app_users (id, name, email, status)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       status = excluded.status`
  );
  const upsertMembership = db.prepare(
    `INSERT INTO user_portfolio_memberships (id, user_id, portfolio_id, role, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       portfolio_id = excluded.portfolio_id,
       role = excluded.role,
       status = excluded.status`
  );

  for (const user of seededUsers) {
    upsertUser.run(user.userId, user.name, user.email, "active");
    upsertMembership.run(user.membershipId, user.userId, "pf_001", user.role, "active");
  }
}

function applyMigrations(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const migrationId of initialMigrations) {
    const migrationAlreadyApplied = db
      .prepare("SELECT id FROM schema_migrations WHERE id = ?")
      .get(migrationId);

    if (migrationAlreadyApplied) {
      continue;
    }

    const sql = readFileSync(getMigrationPath(migrationId), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(migrationId);
  }
}

function initializeDatabase() {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(db);
  seedInitialData(db);
  reconcileSeedData(db);
  return db;
}

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }

  return dbInstance;
}

export type PortfolioSummary = {
  id: string;
  name: string;
  ownerName?: string;
  timezone: string;
  status: string;
};

export type PortfolioWorkspace = PortfolioSummary & {
  buildingCount: number;
  pathways: CompliancePathway[];
  primaryPathwayLabel: string;
  buildings: Building[];
};

export type BuildingImportRow = {
  name?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zip?: string;
  bbl?: string;
  bin?: string;
  dofGsf?: number;
  reportedGfa?: number;
  article?: "320" | "321";
  pathway?: Exclude<CompliancePathway, "UNKNOWN">;
};

export type BuildingImportResult = {
  importId: string;
  received: number;
  matched: number;
  needsReview: number;
};

export type UpdateBuildingBasProfileInput = {
  buildingId: string;
  basPresent?: BuildingAvailability;
  basVendor?: string;
  basProtocol?: BuildingBasProtocol;
  basAccessState?: BuildingBasAccessState;
  pointListAvailable?: BuildingAvailability;
  schedulesAvailable?: BuildingAvailability;
  ventilationSystemArchetype?: VentilationSystemArchetype;
  equipmentInventoryStatus?: EquipmentInventoryStatus;
  actorType?: AuditActorType;
};

export type DocumentRecord = ReportingDocument;

export type BasPointRecord = {
  id: string;
  monitoringAssetId: string;
  objectIdentifier: string;
  objectName: string;
  canonicalPointType?: string;
  unit?: string;
  isWritable: boolean;
  isWhitelisted: boolean;
  safetyCategory?: string;
};

export type ControlCommandRecord = {
  id: string;
  buildingId: string;
  pointId: string;
  commandType: string;
  previousValue?: string;
  requestedValue: string;
  requestedAt: string;
  approvedAt?: string;
  executedAt?: string;
  expiresAt?: string;
  expiredAt?: string;
  rollbackPolicy?: string;
  rollbackValue?: string;
  rollbackExecutedAt?: string;
  executionNotes?: string;
  status: string;
};

export type CoverageResolutionRecord = {
  buildingId: string;
  coveredStatus: "covered" | "unknown";
  pathway: CompliancePathway;
  article: Building["article"];
  pathwaySummary: string;
  confidenceScore: number;
};

export type DiscoveryRunRecord = {
  id: string;
  buildingId: string;
  assetId: string;
  pointId: string;
  gatewayId?: string;
  assetCount?: number;
  pointCount?: number;
  telemetryEventCount?: number;
  status: "queued" | "existing" | "completed" | "failed";
};

export type AppWorkspace = {
  portfolioCount: number;
  buildingCount: number;
  documentCount: number;
  commandCount: number;
  pendingCommandCount: number;
  issueCount: number;
  firstPortfolioId?: string;
  firstBuildingId?: string;
};

export type EvidenceLinkRecord = {
  id: string;
  documentId: string;
  requirementId: string;
  buildingId: string;
  documentType: string;
  requirementType: ComplianceRequirement["type"];
  linkStatus: EvidenceLinkStatus;
  notes?: string;
};

export type DocumentWorkspace = {
  documents: DocumentRecord[];
  requirements: ComplianceRequirement[];
  evidenceLinks: EvidenceLinkRecord[];
  auditEvents: AuditEvent[];
};

export type ReportingInputFieldDefinition = {
  key: string;
  label: string;
  family: ReportingInputFieldFamily;
  inputHint: "text" | "number" | "boolean" | "json" | "enum";
  manualConfirmationRequired?: boolean;
};

export type PublicBuildingRecord = {
  id: string;
  datasetName: string;
  sourceVersion?: string;
  sourceRecordKey?: string;
  addressLine1: string;
  city?: string;
  state?: string;
  zip?: string;
  bbl?: string;
  bin?: string;
  coveredStatus?: string;
  compliancePathway?: string;
  article?: string;
  grossSquareFeet?: number;
};

export type PublicImportRunRecord = {
  id: string;
  datasetName: string;
  sourceVersion?: string;
  sourceFile?: string;
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  status: string;
  startedAt: string;
  completedAt?: string;
  summaryJson?: string;
};

export type PublicBuildingMatchRecord = {
  id: string;
  buildingId: string;
  publicRecordId: string;
  matchMethod: string;
  confidenceScore: number;
  status: string;
};

export type PublicSourceWorkspace = {
  candidates: PublicBuildingRecord[];
  matches: PublicBuildingMatchRecord[];
};

export const appUserRoles = ["owner", "operator", "rdp", "rcxa"] as const;

export type AppUserRole = (typeof appUserRoles)[number];

export type AppUserRecord = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export type PortfolioMembershipRecord = {
  id: string;
  userId: string;
  portfolioId: string;
  portfolioName: string;
  role: AppUserRole;
  status: string;
};

export type AppSessionRecord = {
  id: string;
  user: AppUserRecord;
  memberships: PortfolioMembershipRecord[];
  activeMembershipId?: string;
  activePortfolioId?: string;
  activePortfolioName?: string;
  activeRole?: AppUserRole;
  status: string;
  createdAt: string;
  lastSeenAt?: string;
  expiresAt?: string;
};

export type TelemetryEventRecord = {
  id: string;
  buildingId: string;
  systemId?: string;
  pointId?: string;
  timestamp: string;
  valueNumeric?: number;
  valueText?: string;
  unit?: string;
  qualityFlag?: string;
};

const reportingFieldDefinitions = [
  { key: "bbl", label: "BBL", family: "identity", inputHint: "text" },
  { key: "bin", label: "BIN", family: "identity", inputHint: "text" },
  { key: "address", label: "Address", family: "identity", inputHint: "text" },
  { key: "reporting_year", label: "Reporting year", family: "identity", inputHint: "number" },
  { key: "covered_status", label: "Covered status", family: "coverage", inputHint: "text" },
  { key: "article", label: "Article", family: "coverage", inputHint: "text" },
  { key: "pathway", label: "Pathway", family: "coverage", inputHint: "text" },
  { key: "cbl_version", label: "CBL version", family: "coverage", inputHint: "text" },
  { key: "cbl_dispute_status", label: "CBL dispute status", family: "coverage", inputHint: "text", manualConfirmationRequired: true },
  { key: "espm_property_id", label: "ESPM property ID", family: "espm", inputHint: "text" },
  { key: "espm_property_name", label: "ESPM property name", family: "espm", inputHint: "text" },
  { key: "espm_shared_with_city", label: "ESPM shared with city", family: "espm", inputHint: "boolean", manualConfirmationRequired: true },
  { key: "duplicate_pmid_flag", label: "Duplicate PMID flag", family: "espm", inputHint: "boolean" },
  { key: "meter_count", label: "Meter count", family: "energy", inputHint: "number" },
  { key: "gross_square_feet", label: "Gross square feet", family: "area", inputHint: "number" },
  { key: "gross_floor_area_total", label: "Gross floor area total", family: "area", inputHint: "number" },
  { key: "gfa_by_property_type", label: "GFA by property type", family: "area", inputHint: "json" },
  { key: "energy_by_source", label: "Annual energy by source", family: "energy", inputHint: "json" },
  { key: "article_321_pathway_mode", label: "Article 321 pathway mode", family: "workflow", inputHint: "enum", manualConfirmationRequired: true },
  { key: "prior_year_compliance_status", label: "Prior year compliance status", family: "workflow", inputHint: "text", manualConfirmationRequired: true },
  { key: "methods_used_to_comply", label: "Methods used to comply", family: "workflow", inputHint: "text", manualConfirmationRequired: true },
  { key: "pathway_dispute_rationale", label: "Pathway dispute rationale", family: "workflow", inputHint: "text", manualConfirmationRequired: true },
  { key: "extension_requested", label: "Extension requested", family: "extension", inputHint: "boolean", manualConfirmationRequired: true },
  { key: "deduction_template_version", label: "Deduction template version", family: "deductions", inputHint: "text" },
  { key: "tou_inputs", label: "TOU inputs", family: "deductions", inputHint: "json" },
  { key: "tes_inputs", label: "TES inputs", family: "deductions", inputHint: "json" },
  { key: "beneficial_electrification_banking", label: "Beneficial electrification banking", family: "deductions", inputHint: "json", manualConfirmationRequired: true },
  { key: "constraint_type", label: "320.7 constraint type", family: "adjustment_320_7", inputHint: "text", manualConfirmationRequired: true },
  { key: "constraint_term", label: "320.7 constraint term", family: "adjustment_320_7", inputHint: "text", manualConfirmationRequired: true },
  { key: "offsets_purchased", label: "Offsets purchased", family: "adjustment_320_7", inputHint: "boolean", manualConfirmationRequired: true },
  { key: "supporting_plan_status", label: "Supporting plan status", family: "adjustment_320_7", inputHint: "text", manualConfirmationRequired: true },
  { key: "approved_adjustment_type", label: "Approved adjustment type", family: "adjustment_320_8_320_9", inputHint: "text", manualConfirmationRequired: true },
  { key: "approval_reference", label: "Approval reference", family: "adjustment_320_8_320_9", inputHint: "text", manualConfirmationRequired: true },
  { key: "carryforward_from_2025", label: "Carryforward from 2025", family: "adjustment_320_8_320_9", inputHint: "boolean", manualConfirmationRequired: true },
  { key: "mitigation_requested", label: "Mitigation requested", family: "mitigation", inputHint: "boolean", manualConfirmationRequired: true },
  { key: "good_faith_efforts", label: "Good faith efforts", family: "mitigation", inputHint: "json", manualConfirmationRequired: true },
  { key: "prior_compliant_report_reference", label: "Prior compliant report reference", family: "mitigation", inputHint: "text", manualConfirmationRequired: true }
] as const satisfies ReadonlyArray<ReportingInputFieldDefinition>;

const reportingFieldDefinitionByKey = new Map<string, ReportingInputFieldDefinition>(
  reportingFieldDefinitions.map((definition) => [definition.key, definition] as const)
);

const defaultReportingDueDate = "2026-06-30";
const defaultExtendedDueDate = "2026-08-29";
const calculationVersion = "ll97-2026-v1";

const energyEmissionFactors = {
  electricity_kwh: 0.000288962,
  natural_gas_therms: 0.005302,
  district_steam_mlbs: 52.44,
  fuel_oil_2_gallons: 0.01021,
  fuel_oil_4_gallons: 0.01137
} as const;

const propertyTypeLimitFactors: Record<string, number> = {
  multifamily: 0.00675,
  affordable_housing: 0.00675,
  office: 0.00846,
  hotel: 0.00987,
  retail: 0.01181,
  mixed_use: 0.0079,
  default: 0.0075
};

const article321ReviewerRole: AttestationRole = "rcxa";

export type BacnetGatewayRecord = {
  id: string;
  buildingId: string;
  name: string;
  protocol: string;
  vendor?: string;
  host?: string;
  port?: number;
  status: string;
  authType?: string;
  ingestToken?: string;
  runtimeMode?: string;
  commandEndpoint?: string;
  metadataJson?: string;
  agentVersion?: string;
  heartbeatStatus?: string;
  pollIntervalSeconds?: number;
  lastHeartbeatAt?: string;
  lastPollRequestedAt?: string;
  lastPollCompletedAt?: string;
  nextPollDueAt?: string;
  runtimeMetadataJson?: string;
  lastSeenAt?: string;
  lastDiscoveryAt?: string;
  createdAt: string;
};

export type GatewayCommandDispatchRecord = {
  id: string;
  gatewayId: string;
  commandId: string;
  buildingId: string;
  pointId: string;
  status: string;
  payloadJson: string;
  responseJson?: string;
  errorMessage?: string;
  createdAt: string;
  dispatchedAt?: string;
  acknowledgedAt?: string;
  deliveryAttemptCount: number;
  lastDeliveryAttemptAt?: string;
};

export type MonitoringAssetRecord = {
  id: string;
  buildingId: string;
  systemName: string;
  assetType: string;
  protocol: string;
  vendor?: string;
  location?: string;
  status: string;
  sourceGatewayId?: string;
  sourceAssetKey?: string;
};

export type MonitoringWorkspace = {
  gateways: BacnetGatewayRecord[];
  assets: MonitoringAssetRecord[];
  issues: MonitoringIssue[];
  basPoints: BasPointRecord[];
  telemetryEvents: TelemetryEventRecord[];
  recommendationActions: RecommendationAction[];
  discoveryRuns: DiscoveryRunRecord[];
  dispatches: GatewayCommandDispatchRecord[];
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeSecretToken(prefix: string) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function addSecondsToIso(timestamp: string, seconds: number) {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}

function normalizePollIntervalSeconds(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 300;
  }

  return Math.max(30, Math.round(value));
}

function normalizeGatewayBridgeBackend(value?: string | null) {
  return value === "simulated" || value === "file-feed" || value === "bacnet-sdk" ? value : "bacnet-sdk";
}

function getGatewayMetadata(gateway: Pick<BacnetGatewayRecord, "metadataJson">) {
  return parseJsonObject(gateway.metadataJson);
}

function getGatewayDispatchPolicy(gateway: Pick<BacnetGatewayRecord, "metadataJson">) {
  const metadata = getGatewayMetadata(gateway);
  const dispatchPolicy =
    metadata.dispatchPolicy && typeof metadata.dispatchPolicy === "object"
      ? (metadata.dispatchPolicy as Record<string, unknown>)
      : {};
  const timeoutSeconds = Number(dispatchPolicy.timeoutSeconds);
  const maxAttempts = Number(dispatchPolicy.maxAttempts);

  return {
    timeoutSeconds: Number.isFinite(timeoutSeconds) ? Math.max(30, Math.round(timeoutSeconds)) : 180,
    maxAttempts: Number.isFinite(maxAttempts) ? Math.max(1, Math.round(maxAttempts)) : 3
  };
}

function parseGatewaySdkConfig(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function collectGatewaySdkPoints(config: Record<string, unknown>) {
  const topLevelPoints = Array.isArray(config.points) ? (config.points as Array<Record<string, unknown>>) : [];
  const assetPoints = Array.isArray(config.assets)
    ? (config.assets as Array<Record<string, unknown>>).flatMap((asset) =>
        Array.isArray(asset.points) ? (asset.points as Array<Record<string, unknown>>) : []
      )
    : [];

  return [...topLevelPoints, ...assetPoints];
}

function validateGatewayConfigurationInput(input: {
  bridgeBackend?: string;
  sdkModulePath?: string;
  sdkExportName?: string;
  sdkConfigJson?: string;
}) {
  const bridgeBackend = normalizeGatewayBridgeBackend(input.bridgeBackend);
  const issues: string[] = [];
  const warnings: string[] = [];
  const sdkConfig = parseGatewaySdkConfig(input.sdkConfigJson);
  const points = sdkConfig ? collectGatewaySdkPoints(sdkConfig) : [];
  const writablePointCount = points.filter((point) => point.isWritable === true).length;
  const whitelistedPointCount = points.filter((point) => point.isWhitelisted === true).length;
  const occupancyLikePointCount = points.filter((point) => {
    const type = typeof point.canonicalPointType === "string" ? point.canonicalPointType : "";
    return type === "occupancy_mode" || type === "schedule";
  }).length;
  const occupancyEnumMapCount = points.filter((point) => {
    const type = typeof point.canonicalPointType === "string" ? point.canonicalPointType : "";
    return (
      (type === "occupancy_mode" || type === "schedule") &&
      point.enumMap &&
      typeof point.enumMap === "object" &&
      Object.keys(point.enumMap as Record<string, unknown>).length > 0
    );
  }).length;

  if (bridgeBackend === "bacnet-sdk") {
    if (!input.sdkModulePath?.trim()) {
      issues.push("SDK module path is required for the bacnet-sdk bridge backend.");
    }

    if (!input.sdkConfigJson?.trim()) {
      issues.push("SDK config JSON is required for the bacnet-sdk bridge backend.");
    } else if (!sdkConfig) {
      issues.push("SDK config JSON could not be parsed into an object.");
    } else {
      if (typeof sdkConfig.targetAddress !== "string" || sdkConfig.targetAddress.trim().length === 0) {
        issues.push("targetAddress is required in SDK config JSON.");
      }

      if (points.length === 0) {
        issues.push("At least one configured point is required in SDK config JSON.");
      }

      if (typeof sdkConfig.skipWhoIs !== "boolean" && typeof sdkConfig.deviceInstance !== "number") {
        warnings.push("Set deviceInstance or skipWhoIs so discovery behavior is explicit before live rollout.");
      }
    }
  }

  if (points.length > 0 && writablePointCount === 0) {
    warnings.push("No writable points are configured yet; supervised command testing will stay read-only.");
  }

  if (writablePointCount > 0 && whitelistedPointCount === 0) {
    warnings.push("Writable points are configured but none are explicitly whitelisted for supervised commands.");
  }

  if (occupancyLikePointCount > 0 && occupancyEnumMapCount < occupancyLikePointCount) {
    warnings.push("Some occupancy or schedule points are missing enumMap values, so replayed states may stay numeric.");
  }

  return {
    bridgeBackend,
    sdkConfig,
    pointCount: points.length,
    writablePointCount,
    whitelistedPointCount,
    status: issues.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid",
    issues,
    warnings,
    validatedAt: new Date().toISOString()
  };
}

type GatewayReplayScenario =
  | "high_co2_low_ventilation"
  | "after_hours_runtime"
  | "schedule_mismatch"
  | "stale_override"
  | "sensor_fault";

function normalizeReplayScenario(value?: string | null): GatewayReplayScenario {
  switch (value) {
    case "after_hours_runtime":
    case "schedule_mismatch":
    case "stale_override":
    case "sensor_fault":
      return value;
    default:
      return "high_co2_low_ventilation";
  }
}

function defaultReplayObservedAt(scenario: GatewayReplayScenario) {
  switch (scenario) {
    case "after_hours_runtime":
      return "2026-04-15T23:30:00Z";
    case "stale_override":
      return "2026-04-15T14:00:00Z";
    default:
      return "2026-04-15T13:30:00Z";
  }
}

function buildReplaySnapshot(observedAt: string) {
  return {
    observedAt,
    assets: [
      {
        assetKey: "corridor_ahu",
        systemName: "Corridor AHU",
        assetType: "ahu",
        protocol: "BACnet/IP",
        vendor: "AirWise Replay",
        location: "Roof",
        status: "active",
        points: [
          {
            pointKey: "corridor_schedule",
            objectIdentifier: "schedule,11",
            objectName: "Corridor AHU Schedule",
            canonicalPointType: "schedule",
            unit: "enum",
            isWritable: true,
            isWhitelisted: true,
            presentValue: "occupied"
          },
          {
            pointKey: "corridor_occupancy_mode",
            objectIdentifier: "multi-state-value,9",
            objectName: "Corridor Occupancy Mode",
            canonicalPointType: "occupancy_mode",
            unit: "enum",
            isWritable: true,
            isWhitelisted: true,
            presentValue: "occupied"
          },
          {
            pointKey: "corridor_manual_override",
            objectIdentifier: "binary-value,14",
            objectName: "Corridor Manual Override",
            canonicalPointType: "manual_override",
            unit: "binary",
            isWritable: true,
            isWhitelisted: true,
            presentValue: "auto"
          },
          {
            pointKey: "corridor_fan_status",
            objectIdentifier: "binary-input,5",
            objectName: "Corridor Fan Status",
            canonicalPointType: "fan_status",
            unit: "binary",
            presentValue: "on"
          },
          {
            pointKey: "corridor_co2",
            objectIdentifier: "analog-input,18",
            objectName: "Corridor CO2",
            canonicalPointType: "co2",
            unit: "ppm",
            presentValue: 760
          },
          {
            pointKey: "corridor_temperature",
            objectIdentifier: "analog-input,19",
            objectName: "Corridor Temperature",
            canonicalPointType: "temperature",
            unit: "F",
            presentValue: 70
          }
        ]
      }
    ]
  };
}

function buildReplayScenarioEvents(scenario: GatewayReplayScenario, observedAt: string) {
  const baseAt = Date.parse(observedAt);
  const at = (offsetMinutes: number) => new Date(baseAt + offsetMinutes * 60 * 1000).toISOString();

  switch (scenario) {
    case "after_hours_runtime":
      return [
        {
          observedAt,
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_fan_status", objectIdentifier: "binary-input,5", value: "on", unit: "binary", qualityFlag: "ok" }
          ]
        }
      ];
    case "schedule_mismatch":
      return [
        {
          observedAt: at(-15),
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_schedule", objectIdentifier: "schedule,11", value: "unoccupied", unit: "enum", qualityFlag: "ok" },
            { assetKey: "corridor_ahu", pointKey: "corridor_occupancy_mode", objectIdentifier: "multi-state-value,9", value: "unoccupied", unit: "enum", qualityFlag: "ok" }
          ]
        },
        {
          observedAt,
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_fan_status", objectIdentifier: "binary-input,5", value: "on", unit: "binary", qualityFlag: "ok" }
          ]
        }
      ];
    case "stale_override":
      return [
        {
          observedAt: at(-180),
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_manual_override", objectIdentifier: "binary-value,14", value: "override", unit: "binary", qualityFlag: "ok" }
          ]
        },
        {
          observedAt,
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_fan_status", objectIdentifier: "binary-input,5", value: "on", unit: "binary", qualityFlag: "ok" }
          ]
        }
      ];
    case "sensor_fault":
      return [
        {
          observedAt,
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_co2", objectIdentifier: "analog-input,18", value: 0, unit: "ppm", qualityFlag: "fault" }
          ]
        }
      ];
    case "high_co2_low_ventilation":
    default:
      return [
        {
          observedAt: at(-10),
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_fan_status", objectIdentifier: "binary-input,5", value: "off", unit: "binary", qualityFlag: "ok" }
          ]
        },
        {
          observedAt,
          events: [
            { assetKey: "corridor_ahu", pointKey: "corridor_co2", objectIdentifier: "analog-input,18", value: 1125, unit: "ppm", qualityFlag: "ok" }
          ]
        }
      ];
  }
}

function recordAuditEvent(input: {
  buildingId?: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: AuditActorType;
  summary: string;
  metadataJson?: string;
}) {
  const db = getDatabase();

  db.prepare(
    `INSERT INTO audit_events (id, building_id, entity_type, entity_id, action, actor_type, summary, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    makeId("audit"),
    input.buildingId ?? null,
    input.entityType,
    input.entityId,
    input.action,
    input.actorType,
    input.summary,
    input.metadataJson ?? null
  );
}

function getCount(sql: string, ...params: Array<string | number>) {
  const db = getDatabase();
  const row = db.prepare(sql).get(...params) as { count: number } | undefined;
  return Number(row?.count ?? 0);
}

function parseJsonObject(value?: string | null): Record<string, unknown> {
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

function parseJsonValue<T = unknown>(value?: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getReportingFieldDefinition(fieldKey: string): ReportingInputFieldDefinition {
  return (
    reportingFieldDefinitionByKey.get(fieldKey) ?? {
      key: fieldKey,
      label: fieldKey.replaceAll("_", " "),
      family: "workflow",
      inputHint: "text"
    }
  );
}

function inferFieldFamily(fieldKey: string): ReportingInputFieldFamily {
  return getReportingFieldDefinition(fieldKey).family;
}

function parseManualInputValue(valueText: string): unknown {
  const trimmed = valueText.trim();

  if (trimmed === "") {
    return "";
  }

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

function serializeJson(value: unknown) {
  return JSON.stringify(value);
}

function getReportingDueDate(reportingYear: number, extensionRequested: boolean) {
  if (reportingYear === 2026 && extensionRequested) {
    return defaultExtendedDueDate;
  }

  if (reportingYear === 2026) {
    return defaultReportingDueDate;
  }

  return `${reportingYear}-06-30`;
}

function getExtensionDueDate(reportingYear: number) {
  return reportingYear === 2026 ? defaultReportingDueDate : `${reportingYear}-06-30`;
}

function getCoreModuleTypeForArticle(article: Building["article"]): FilingModuleType {
  return article === "321" ? "article_321_report" : "article_320_report";
}

function isTruthy(value: unknown) {
  return value === true || value === "true" || value === 1;
}

function getCycleAcceptedInputMap(packageId: string) {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT field_key, value_json
       FROM input_values
       WHERE package_id = ? AND review_status = 'accepted'
       ORDER BY reviewed_at DESC, created_at DESC`
    )
    .all(packageId) as Array<{ field_key: string; value_json: string }>;

  return new Map(
    rows.map((row) => [row.field_key, parseJsonValue(row.value_json)] as const)
  );
}

function getCycleNeedsReviewFieldKeys(packageId: string) {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT DISTINCT field_key
       FROM input_values
       WHERE package_id = ? AND review_status = 'pending_review'
       ORDER BY field_key ASC`
    )
    .all(packageId) as Array<{ field_key: string }>;

  return rows.map((row) => row.field_key);
}

function getCoreRequiredFieldKeys(article: Building["article"], pathwayMode?: Article321PathwayMode | null) {
  const base = [
    "bbl",
    "bin",
    "address",
    "covered_status",
    "article",
    "pathway",
    "espm_property_id",
    "espm_property_name",
    "gross_floor_area_total",
    "gfa_by_property_type",
    "energy_by_source",
    "prior_year_compliance_status",
    "methods_used_to_comply"
  ];

  if (article === "321") {
    return [...base, "article_321_pathway_mode"].concat(pathwayMode === "performance" ? [] : []);
  }

  return base;
}

function getRequiredFieldKeysForActiveModules(
  article: Building["article"],
  acceptedInputs: Map<string, unknown>,
  activeModuleTypes: FilingModuleType[]
) {
  const pathwayMode =
    acceptedInputs.get("article_321_pathway_mode") === "prescriptive" ? "prescriptive" : "performance";
  const required = new Set<string>(getCoreRequiredFieldKeys(article, pathwayMode));

  for (const moduleType of activeModuleTypes) {
    if (moduleType === "extension") {
      required.add("extension_requested");
    }

    if (moduleType === "deductions") {
      required.add("deduction_template_version");
      required.add("tou_inputs");
      required.add("tes_inputs");
      required.add("beneficial_electrification_banking");
    }

    if (moduleType === "adjustment_320_7") {
      required.add("constraint_type");
      required.add("constraint_term");
      required.add("offsets_purchased");
      required.add("supporting_plan_status");
    }

    if (moduleType === "adjustment_320_8_320_9") {
      required.add("approved_adjustment_type");
      required.add("approval_reference");
      required.add("carryforward_from_2025");
    }

    if (moduleType === "penalty_mitigation") {
      required.add("mitigation_requested");
      required.add("good_faith_efforts");
      required.add("prior_compliant_report_reference");
    }
  }

  return Array.from(required);
}

function valueAsNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function computeActualEmissions(energyBySource: Record<string, unknown>) {
  return Object.entries(energyBySource).reduce((total, [key, value]) => {
    const usage = valueAsNumber(value) ?? 0;
    const factor = energyEmissionFactors[key as keyof typeof energyEmissionFactors] ?? 0;
    return total + usage * factor;
  }, 0);
}

function computeLimitFromGfa(gfaByPropertyType: Record<string, unknown>) {
  return Object.entries(gfaByPropertyType).reduce((total, [propertyType, value]) => {
    const gfa = valueAsNumber(value) ?? 0;
    const factor = propertyTypeLimitFactors[propertyType] ?? propertyTypeLimitFactors.default;
    return total + gfa * factor;
  }, 0);
}

function updateReportingCycleStatus(reportingCycleId: string, filingStatus: ReportingCycleStatus, filingDueDate?: string) {
  const db = getDatabase();
  db.prepare(
    `UPDATE reporting_cycles
     SET filing_status = ?, filing_due_date = COALESCE(?, filing_due_date), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(filingStatus, filingDueDate ?? null, reportingCycleId);
}

function listFilingModulesByCycleId(reportingCycleId: string): FilingModule[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, reporting_cycle_id, module_type, status, due_date, prerequisite_state, blocking_reason
       FROM filing_modules
       WHERE reporting_cycle_id = ?
       ORDER BY due_date ASC, module_type ASC`
    )
    .all(reportingCycleId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        reporting_cycle_id: string;
        module_type: FilingModuleType;
        status: FilingModuleStatus;
        due_date: string;
        prerequisite_state: string;
        blocking_reason: string | null;
      };

      return {
        id: typedRow.id,
        reportingCycleId: typedRow.reporting_cycle_id,
        moduleType: typedRow.module_type,
        status: typedRow.status,
        dueDate: typedRow.due_date,
        prerequisiteState: typedRow.prerequisite_state,
        blockingReason: typedRow.blocking_reason ?? undefined
      };
    });
}

function listInputValuesByPackageId(packageId: string): ReportingInputValue[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, package_id, field_key, value_json, source_type, source_ref, confidence_score, review_status, reviewed_by, reviewed_at
       FROM input_values
       WHERE package_id = ?
       ORDER BY field_key ASC, created_at DESC`
    )
    .all(packageId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        package_id: string;
        field_key: string;
        value_json: string;
        source_type: ReportingInputSourceType;
        source_ref: string | null;
        confidence_score: number | null;
        review_status: ReportingInputReviewStatus;
        reviewed_by: AuditActorType | null;
        reviewed_at: string | null;
      };

      return {
        id: typedRow.id,
        packageId: typedRow.package_id,
        fieldKey: typedRow.field_key,
        fieldFamily: inferFieldFamily(typedRow.field_key),
        valueJson: typedRow.value_json,
        sourceType: typedRow.source_type,
        sourceRef: typedRow.source_ref ?? undefined,
        confidenceScore: typedRow.confidence_score ?? undefined,
        reviewStatus: typedRow.review_status,
        reviewedBy: typedRow.reviewed_by ?? undefined,
        reviewedAt: typedRow.reviewed_at ?? undefined
      };
    });
}

function listDocumentExtractionsByDocumentIds(documentIds: string[]): DocumentExtraction[] {
  if (documentIds.length === 0) {
    return [];
  }

  const db = getDatabase();
  const placeholders = documentIds.map(() => "?").join(", ");
  return db
    .prepare(
      `SELECT id, document_id, field_key, value_json, confidence_score, page_ref, extraction_method
       FROM document_extractions
       WHERE document_id IN (${placeholders})
       ORDER BY id DESC`
    )
    .all(...documentIds)
    .map((row) => {
      const typedRow = row as {
        id: string;
        document_id: string;
        field_key: string;
        value_json: string;
        confidence_score: number;
        page_ref: string | null;
        extraction_method: string;
      };

      return {
        id: typedRow.id,
        documentId: typedRow.document_id,
        fieldKey: typedRow.field_key,
        valueJson: typedRow.value_json,
        confidenceScore: typedRow.confidence_score,
        pageRef: typedRow.page_ref ?? undefined,
        extractionMethod: typedRow.extraction_method
      };
    });
}

function listAttestationsByCycleId(reportingCycleId: string): FilingAttestation[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, reporting_cycle_id, role, signer_name, owner_of_record_match_status, completion_status, completed_at
       FROM attestations
       WHERE reporting_cycle_id = ?
       ORDER BY role ASC`
    )
    .all(reportingCycleId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        reporting_cycle_id: string;
        role: AttestationRole;
        signer_name: string | null;
        owner_of_record_match_status: OwnerRecordMatchStatus;
        completion_status: "pending" | "completed" | "blocked";
        completed_at: string | null;
      };

      return {
        id: typedRow.id,
        reportingCycleId: typedRow.reporting_cycle_id,
        role: typedRow.role,
        signerName: typedRow.signer_name ?? undefined,
        ownerOfRecordMatchStatus: typedRow.owner_of_record_match_status,
        completionStatus: typedRow.completion_status,
        completedAt: typedRow.completed_at ?? undefined
      };
    });
}

function listArticle321PecmStatusesByCycleId(reportingCycleId: string): Article321PecmStatus[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, reporting_cycle_id, pecm_key, pecm_label, applicability, compliance_status, evidence_state, reviewer_role, notes
       FROM article_321_pecm_statuses
       WHERE reporting_cycle_id = ?
       ORDER BY pecm_key ASC`
    )
    .all(reportingCycleId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        reporting_cycle_id: string;
        pecm_key: string;
        pecm_label: string;
        applicability: PecmApplicability;
        compliance_status: PecmComplianceStatus;
        evidence_state: "missing" | "pending_review" | "accepted" | "rejected";
        reviewer_role: AttestationRole;
        notes: string | null;
      };

      return {
        id: typedRow.id,
        reportingCycleId: typedRow.reporting_cycle_id,
        pecmKey: typedRow.pecm_key,
        pecmLabel: typedRow.pecm_label,
        applicability: typedRow.applicability,
        complianceStatus: typedRow.compliance_status,
        evidenceState: typedRow.evidence_state,
        reviewerRole: typedRow.reviewer_role,
        notes: typedRow.notes ?? undefined
      };
    });
}

function getLatestCalculationRunByCycleId(reportingCycleId: string): CalculationRun | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, reporting_cycle_id, calculation_version, missing_required_inputs_json, needs_review_json, warnings_json, calculation_outputs_json, created_at
       FROM calculation_runs
       WHERE reporting_cycle_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(reportingCycleId) as
    | {
        id: string;
        reporting_cycle_id: string;
        calculation_version: string;
        missing_required_inputs_json: string;
        needs_review_json: string;
        warnings_json: string;
        calculation_outputs_json: string;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    reportingCycleId: row.reporting_cycle_id,
    calculationVersion: row.calculation_version,
    missingRequiredInputs: parseJsonValue<string[]>(row.missing_required_inputs_json) ?? [],
    needsReview: parseJsonValue<string[]>(row.needs_review_json) ?? [],
    warnings: parseJsonValue<string[]>(row.warnings_json) ?? [],
    calculationOutputs: parseJsonObject(row.calculation_outputs_json),
    createdAt: row.created_at
  };
}

function normalizeCompliancePathway(pathway?: string | null): CompliancePathway {
  return pathway === "CP0" || pathway === "CP1" || pathway === "CP2" || pathway === "CP3" || pathway === "CP4"
    ? pathway
    : "UNKNOWN";
}

function normalizeArticle(article?: string | null): Building["article"] {
  return article === "320" || article === "321" ? article : "UNKNOWN";
}

function normalizeDigits(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replaceAll(/\D/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeTextToken(value?: string | null) {
  return value
    ?.toUpperCase()
    .replaceAll(/[^A-Z0-9 ]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeAddressKey(input: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const address = normalizeTextToken(input.addressLine1);
  const city = normalizeTextToken(input.city);
  const state = normalizeTextToken(input.state);
  const zip = normalizeDigits(input.zip);

  return [address, city, state, zip].filter((part) => part && part.length > 0).join("|") || undefined;
}

function normalizeSourceKey(value?: string | null) {
  const normalized = value
    ?.trim()
    .toUpperCase()
    .replace(/[^A-Z0-9:_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return normalized && normalized.length > 0 ? normalized : undefined;
}

function inferCanonicalPointType(input: {
  objectName?: string | null;
  objectIdentifier?: string | null;
  unit?: string | null;
}): MonitoringPointType | undefined {
  const haystack = `${input.objectName ?? ""} ${input.objectIdentifier ?? ""} ${input.unit ?? ""}`.toLowerCase();

  if (haystack.includes("schedule")) {
    return "schedule";
  }
  if (haystack.includes("occup")) {
    return "occupancy_mode";
  }
  if (haystack.includes("co2")) {
    return "co2";
  }
  if (haystack.includes("humid")) {
    return "humidity";
  }
  if (haystack.includes("temp")) {
    return "temperature";
  }
  if (haystack.includes("damper")) {
    return "damper_position";
  }
  if (haystack.includes("airflow") || haystack.includes("cfm") || haystack.includes("flow")) {
    return "airflow_proxy";
  }
  if (haystack.includes("alarm")) {
    return "alarm";
  }
  if (haystack.includes("override")) {
    return "manual_override";
  }
  if (haystack.includes("fan") && (haystack.includes("status") || haystack.includes("proof") || haystack.includes("run"))) {
    return "fan_status";
  }
  if (haystack.includes("fan") && (haystack.includes("command") || haystack.includes("enable") || haystack.includes("start"))) {
    return "fan_command";
  }

  return undefined;
}

function inferSafetyCategory(input: {
  objectName?: string | null;
  canonicalPointType?: MonitoringPointType;
  safetyCategory?: string | null;
}) {
  if (input.safetyCategory && input.safetyCategory.trim().length > 0) {
    return input.safetyCategory.trim();
  }

  const haystack = (input.objectName ?? "").toLowerCase();
  if (haystack.includes("fire") || haystack.includes("smoke") || haystack.includes("life safety")) {
    return "life_safety";
  }

  if (
    input.canonicalPointType === "co2" ||
    input.canonicalPointType === "temperature" ||
    input.canonicalPointType === "humidity" ||
    input.canonicalPointType === "airflow_proxy"
  ) {
    return "sensor";
  }

  if (input.canonicalPointType === "alarm") {
    return "alarm";
  }

  return "operational";
}

function normalizeCoveredStatusValue(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (["covered", "yes", "y", "true", "1"].includes(normalized)) {
    return "covered";
  }

  if (["not covered", "not_covered", "no", "n", "false", "0"].includes(normalized)) {
    return "not_covered";
  }

  return normalized;
}

function normalizePublicPathwayValue(value?: string | null) {
  const normalized = normalizeCompliancePathway(value);
  return normalized === "UNKNOWN" ? undefined : normalized;
}

function normalizePublicArticleValue(article?: string | null, pathway?: CompliancePathway) {
  const normalizedArticle = normalizeArticle(article);
  if (normalizedArticle !== "UNKNOWN") {
    return normalizedArticle;
  }

  if (pathway && pathway !== "UNKNOWN") {
    return pathwayMetadata[pathway].article;
  }

  return undefined;
}

function getDeadlineForRequirement(config: SeedConfig, requirementType: string) {
  return (
    config.filingDeadlines.find((item) => item.requirementType === requirementType)?.dueDate ??
    config.filingDeadlines[0]?.dueDate ??
    "2026-05-01"
  );
}

function getRecommendedAction(issueType: MonitoringIssue["issueType"]) {
  switch (issueType) {
    case "after_hours_runtime":
      return "Review the occupied schedule and prepare a temporary schedule or occupancy-mode correction.";
    case "schedule_mismatch":
      return "Compare the BAS schedule against fan runtime and correct the occupied/unoccupied sequence.";
    case "high_co2_low_ventilation":
      return "Inspect airflow and operating mode before increasing ventilation or dispatching an operator.";
    case "stale_override":
      return "Clear the lingering override or convert it into a time-bounded supervised command.";
    case "sensor_fault":
      return "Verify the sensor or gateway health before trusting the control recommendation.";
    case "low_occupancy_high_runtime":
      return "Review runtime against low-load periods and reduce unnecessary ventilation where safe.";
    default:
      return "Review telemetry and operator schedule before taking action.";
  }
}

function upsertOpenRecommendation(input: {
  buildingId: string;
  systemId?: string;
  issueType: MonitoringIssue["issueType"];
  summary: string;
  evidenceWindow: string;
  writebackEligible: boolean;
  confidenceScore: number;
}) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id
       FROM recommendations
       WHERE building_id = ? AND issue_type = ? AND status IN ('open', 'in_progress')
       LIMIT 1`
    )
    .get(input.buildingId, input.issueType) as { id: string } | undefined;
  const evidenceJson = JSON.stringify({ evidenceWindow: input.evidenceWindow });

  if (existing) {
    db.prepare(
      `UPDATE recommendations
       SET summary = ?, evidence_json = ?, recommended_action = ?, writeback_eligible = ?, confidence_score = ?
       WHERE id = ?`
    ).run(
      input.summary,
      evidenceJson,
      getRecommendedAction(input.issueType),
      input.writebackEligible ? 1 : 0,
      input.confidenceScore,
      existing.id
    );

    return existing.id;
  }

  const id = makeId("rec");
  db.prepare(
    `INSERT INTO recommendations (
      id, building_id, system_id, issue_type, summary, evidence_json, recommended_action, writeback_eligible, confidence_score, status, assigned_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.buildingId,
    input.systemId ?? null,
    input.issueType,
    input.summary,
    evidenceJson,
    getRecommendedAction(input.issueType),
    input.writebackEligible ? 1 : 0,
    input.confidenceScore,
    "open",
    "operator"
  );

  return id;
}

function ensureDefaultDiscoveryPoints(db: DatabaseSync, assetId: string) {
  const desiredPoints = [
    {
      id: "occupancy",
      objectIdentifier: "analog-output,1",
      objectName: "Ventilation Occupancy Mode",
      canonicalPointType: "occupancy_mode" as MonitoringPointType,
      unit: "enum",
      isWritable: 1,
      isWhitelisted: 1,
      safetyCategory: "operational",
      metadata: { writableByPilot: true, currentValue: "auto" }
    },
    {
      id: "schedule",
      objectIdentifier: "schedule,4",
      objectName: "Ventilation Occupancy Schedule",
      canonicalPointType: "schedule" as MonitoringPointType,
      unit: "enum",
      isWritable: 1,
      isWhitelisted: 1,
      safetyCategory: "operational",
      metadata: { writableByPilot: true, currentValue: "occupied" }
    },
    {
      id: "co2",
      objectIdentifier: "analog-input,2",
      objectName: "Return Air CO2",
      canonicalPointType: "co2" as MonitoringPointType,
      unit: "ppm",
      isWritable: 0,
      isWhitelisted: 0,
      safetyCategory: "sensor",
      metadata: { discovered: true }
    },
    {
      id: "fan",
      objectIdentifier: "binary-input,3",
      objectName: "Supply Fan Status",
      canonicalPointType: "fan_status" as MonitoringPointType,
      unit: "binary",
      isWritable: 0,
      isWhitelisted: 0,
      safetyCategory: "operational",
      metadata: { discovered: true, currentValue: "off" }
    },
    {
      id: "override",
      objectIdentifier: "multi-state-value,5",
      objectName: "Ventilation Manual Override",
      canonicalPointType: "manual_override" as MonitoringPointType,
      unit: "enum",
      isWritable: 0,
      isWhitelisted: 0,
      safetyCategory: "operational",
      metadata: { discovered: true, currentValue: "auto" }
    }
  ] as const;

  for (const point of desiredPoints) {
    const existing = db
      .prepare(
        `SELECT id FROM bas_points WHERE monitoring_asset_id = ? AND canonical_point_type = ? LIMIT 1`
      )
      .get(assetId, point.canonicalPointType) as { id: string } | undefined;

    if (existing) {
      continue;
    }

    db.prepare(
      `INSERT INTO bas_points (
        id, monitoring_asset_id, object_identifier, object_name, canonical_point_type, unit, is_writable, is_whitelisted, safety_category, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      makeId("point"),
      assetId,
      point.objectIdentifier,
      point.objectName,
      point.canonicalPointType,
      point.unit,
      point.isWritable,
      point.isWhitelisted,
      point.safetyCategory,
      JSON.stringify(point.metadata)
    );
  }
}

export function listPortfolios(): PortfolioSummary[] {
  const db = getDatabase();

  return db
    .prepare(`SELECT id, name, owner_name, timezone, status FROM portfolios ORDER BY name ASC`)
    .all()
    .map((row) => {
      const typedRow = row as {
        id: string;
        name: string;
        owner_name: string | null;
        timezone: string;
        status: string;
      };

      return {
        id: typedRow.id,
        name: typedRow.name,
        ownerName: typedRow.owner_name ?? undefined,
        timezone: typedRow.timezone,
        status: typedRow.status
      };
    });
}

function mapPortfolioMembershipRows(userId: string): PortfolioMembershipRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT upm.id, upm.user_id, upm.portfolio_id, p.name AS portfolio_name, upm.role, upm.status
       FROM user_portfolio_memberships upm
       INNER JOIN portfolios p ON p.id = upm.portfolio_id
       WHERE upm.user_id = ? AND upm.status = 'active'
       ORDER BY p.name ASC, upm.role ASC`
    )
    .all(userId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        user_id: string;
        portfolio_id: string;
        portfolio_name: string;
        role: string;
        status: string;
      };

      return {
        id: typedRow.id,
        userId: typedRow.user_id,
        portfolioId: typedRow.portfolio_id,
        portfolioName: typedRow.portfolio_name,
        role: appUserRoles.includes(typedRow.role as AppUserRole) ? (typedRow.role as AppUserRole) : "owner",
        status: typedRow.status
      };
    });
}

function buildSessionRecord(
  sessionRow:
    | {
        id: string;
        user_id: string;
        active_membership_id: string | null;
        status: string;
        created_at: string;
        last_seen_at: string | null;
        expires_at: string | null;
        user_name: string;
        user_email: string;
        user_status: string;
      }
    | undefined
): AppSessionRecord | null {
  if (!sessionRow) {
    return null;
  }

  const memberships = mapPortfolioMembershipRows(sessionRow.user_id);
  const activeMembership =
    memberships.find((membership) => membership.id === sessionRow.active_membership_id) ?? memberships[0];

  return {
    id: sessionRow.id,
    user: {
      id: sessionRow.user_id,
      name: sessionRow.user_name,
      email: sessionRow.user_email,
      status: sessionRow.user_status
    },
    memberships,
    activeMembershipId: activeMembership?.id,
    activePortfolioId: activeMembership?.portfolioId,
    activePortfolioName: activeMembership?.portfolioName,
    activeRole: activeMembership?.role,
    status: sessionRow.status,
    createdAt: sessionRow.created_at,
    lastSeenAt: sessionRow.last_seen_at ?? undefined,
    expiresAt: sessionRow.expires_at ?? undefined
  };
}

export function listAppUsers(): Array<AppUserRecord & { memberships: PortfolioMembershipRecord[] }> {
  const db = getDatabase();

  return db
    .prepare(`SELECT id, name, email, status FROM app_users WHERE status = 'active' ORDER BY name ASC`)
    .all()
    .map((row) => {
      const typedRow = row as {
        id: string;
        name: string;
        email: string;
        status: string;
      };

      return {
        id: typedRow.id,
        name: typedRow.name,
        email: typedRow.email,
        status: typedRow.status,
        memberships: mapPortfolioMembershipRows(typedRow.id)
      };
    });
}

export function createPortfolioMembership(input: {
  userId: string;
  portfolioId: string;
  role: AppUserRole;
}) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id
       FROM user_portfolio_memberships
       WHERE user_id = ? AND portfolio_id = ? AND role = ?
       LIMIT 1`
    )
    .get(input.userId, input.portfolioId, input.role) as { id: string } | undefined;

  if (existing) {
    db.prepare(`UPDATE user_portfolio_memberships SET status = 'active' WHERE id = ?`).run(existing.id);
    return existing.id;
  }

  const id = makeId("membership");
  db.prepare(
    `INSERT INTO user_portfolio_memberships (id, user_id, portfolio_id, role, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, input.userId, input.portfolioId, input.role, "active");

  return id;
}

export function listBacnetGatewaysByBuildingId(buildingId: string): BacnetGatewayRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, name, protocol, vendor, host, port, status, auth_type, ingest_token, runtime_mode, command_endpoint, metadata_json,
              agent_version, heartbeat_status, poll_interval_seconds, last_heartbeat_at, last_poll_requested_at, last_poll_completed_at, next_poll_due_at, runtime_metadata_json,
              last_seen_at, last_discovery_at, created_at
       FROM bacnet_gateways
       WHERE building_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        name: string;
        protocol: string;
        vendor: string | null;
        host: string | null;
        port: number | null;
        status: string;
        auth_type: string | null;
        ingest_token: string | null;
        runtime_mode: string | null;
        command_endpoint: string | null;
        metadata_json: string | null;
        agent_version: string | null;
        heartbeat_status: string | null;
        poll_interval_seconds: number | null;
        last_heartbeat_at: string | null;
        last_poll_requested_at: string | null;
        last_poll_completed_at: string | null;
        next_poll_due_at: string | null;
        runtime_metadata_json: string | null;
        last_seen_at: string | null;
        last_discovery_at: string | null;
        created_at: string;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        name: typedRow.name,
        protocol: typedRow.protocol,
        vendor: typedRow.vendor ?? undefined,
        host: typedRow.host ?? undefined,
        port: typedRow.port ?? undefined,
        status: typedRow.status,
        authType: typedRow.auth_type ?? undefined,
        ingestToken: typedRow.ingest_token ?? undefined,
        runtimeMode: typedRow.runtime_mode ?? undefined,
        commandEndpoint: typedRow.command_endpoint ?? undefined,
        metadataJson: typedRow.metadata_json ?? undefined,
        agentVersion: typedRow.agent_version ?? undefined,
        heartbeatStatus: typedRow.heartbeat_status ?? undefined,
        pollIntervalSeconds: typedRow.poll_interval_seconds ?? undefined,
        lastHeartbeatAt: typedRow.last_heartbeat_at ?? undefined,
        lastPollRequestedAt: typedRow.last_poll_requested_at ?? undefined,
        lastPollCompletedAt: typedRow.last_poll_completed_at ?? undefined,
        nextPollDueAt: typedRow.next_poll_due_at ?? undefined,
        runtimeMetadataJson: typedRow.runtime_metadata_json ?? undefined,
        lastSeenAt: typedRow.last_seen_at ?? undefined,
        lastDiscoveryAt: typedRow.last_discovery_at ?? undefined,
        createdAt: typedRow.created_at
      };
    });
}

export function getBacnetGatewayById(gatewayId: string): BacnetGatewayRecord | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, building_id, name, protocol, vendor, host, port, status, auth_type, ingest_token, runtime_mode, command_endpoint, metadata_json,
              agent_version, heartbeat_status, poll_interval_seconds, last_heartbeat_at, last_poll_requested_at, last_poll_completed_at, next_poll_due_at, runtime_metadata_json,
              last_seen_at, last_discovery_at, created_at
       FROM bacnet_gateways
       WHERE id = ?
       LIMIT 1`
    )
    .get(gatewayId) as
    | {
        id: string;
        building_id: string;
        name: string;
        protocol: string;
        vendor: string | null;
        host: string | null;
        port: number | null;
        status: string;
        auth_type: string | null;
        ingest_token: string | null;
        runtime_mode: string | null;
        command_endpoint: string | null;
        metadata_json: string | null;
        agent_version: string | null;
        heartbeat_status: string | null;
        poll_interval_seconds: number | null;
        last_heartbeat_at: string | null;
        last_poll_requested_at: string | null;
        last_poll_completed_at: string | null;
        next_poll_due_at: string | null;
        runtime_metadata_json: string | null;
        last_seen_at: string | null;
        last_discovery_at: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.name,
    protocol: row.protocol,
    vendor: row.vendor ?? undefined,
    host: row.host ?? undefined,
    port: row.port ?? undefined,
    status: row.status,
    authType: row.auth_type ?? undefined,
    ingestToken: row.ingest_token ?? undefined,
    runtimeMode: row.runtime_mode ?? undefined,
    commandEndpoint: row.command_endpoint ?? undefined,
    metadataJson: row.metadata_json ?? undefined,
    agentVersion: row.agent_version ?? undefined,
    heartbeatStatus: row.heartbeat_status ?? undefined,
    pollIntervalSeconds: row.poll_interval_seconds ?? undefined,
    lastHeartbeatAt: row.last_heartbeat_at ?? undefined,
    lastPollRequestedAt: row.last_poll_requested_at ?? undefined,
    lastPollCompletedAt: row.last_poll_completed_at ?? undefined,
    nextPollDueAt: row.next_poll_due_at ?? undefined,
    runtimeMetadataJson: row.runtime_metadata_json ?? undefined,
    lastSeenAt: row.last_seen_at ?? undefined,
    lastDiscoveryAt: row.last_discovery_at ?? undefined,
    createdAt: row.created_at
  };
}

function requireGatewayToken(gatewayId: string, token: string) {
  const gateway = getBacnetGatewayById(gatewayId);

  if (!gateway) {
    throw new Error(`Gateway ${gatewayId} not found.`);
  }

  if (!gateway.ingestToken || gateway.ingestToken !== token) {
    throw new Error("Gateway token is invalid.");
  }

  return gateway;
}

function buildGatewayRuntimeState(gateway: BacnetGatewayRecord, asOf = new Date().toISOString()) {
  const pollIntervalSeconds = normalizePollIntervalSeconds(gateway.pollIntervalSeconds);
  const nextPollDueAt = gateway.nextPollDueAt ?? addSecondsToIso(asOf, pollIntervalSeconds);
  const pendingDispatchCount = getDatabase()
    .prepare(`SELECT COUNT(*) AS count FROM gateway_command_dispatches WHERE gateway_id = ? AND status = 'pending'`)
    .get(gateway.id) as { count: number };

  return {
    gatewayId: gateway.id,
    buildingId: gateway.buildingId,
    runtimeMode: gateway.runtimeMode ?? "outbox",
    protocol: gateway.protocol,
    commandEndpoint: gateway.commandEndpoint,
    pollIntervalSeconds,
    nextPollDueAt,
    lastHeartbeatAt: gateway.lastHeartbeatAt,
    lastPollRequestedAt: gateway.lastPollRequestedAt,
    lastPollCompletedAt: gateway.lastPollCompletedAt,
    heartbeatStatus: gateway.heartbeatStatus ?? "unknown",
    agentVersion: gateway.agentVersion,
    pendingDispatchCount: pendingDispatchCount.count
  };
}

function updateGatewayRuntimeMetadata(gatewayId: string, metadata: Record<string, unknown>) {
  const gateway = getBacnetGatewayById(gatewayId);
  if (!gateway) {
    return null;
  }

  const existing = parseJsonObject(gateway.runtimeMetadataJson);
  const next = {
    ...existing,
    ...metadata
  };
  getDatabase().prepare(`UPDATE bacnet_gateways SET runtime_metadata_json = ? WHERE id = ?`).run(JSON.stringify(next), gatewayId);
  return next;
}

export function registerBacnetGateway(input: {
  buildingId: string;
  name: string;
  protocol?: string;
  vendor?: string;
  host?: string;
  port?: number;
  authType?: string;
  runtimeMode?: string;
  commandEndpoint?: string;
  pollIntervalSeconds?: number;
  metadataJson?: string;
}) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id
       FROM bacnet_gateways
       WHERE building_id = ?
         AND LOWER(name) = LOWER(?)
         AND COALESCE(LOWER(host), '') = COALESCE(LOWER(?), '')
       LIMIT 1`
    )
    .get(input.buildingId, input.name, input.host ?? null) as { id: string } | undefined;
  const gatewayId = existing?.id ?? makeId("gw");
  const pollIntervalSeconds = normalizePollIntervalSeconds(input.pollIntervalSeconds);
  const ingestToken =
    existing
      ? ((db
          .prepare(`SELECT ingest_token FROM bacnet_gateways WHERE id = ?`)
          .get(gatewayId) as { ingest_token: string | null } | undefined)?.ingest_token ?? makeSecretToken("gwtok"))
      : makeSecretToken("gwtok");
  const now = new Date().toISOString();
  const nextPollDueAt = addSecondsToIso(now, pollIntervalSeconds);

  if (existing) {
    db.prepare(
      `UPDATE bacnet_gateways
       SET protocol = ?, vendor = ?, host = ?, port = ?, auth_type = ?, ingest_token = COALESCE(?, ingest_token), runtime_mode = ?, command_endpoint = ?, metadata_json = COALESCE(?, metadata_json),
           poll_interval_seconds = ?, next_poll_due_at = COALESCE(next_poll_due_at, ?), status = ?, last_seen_at = ?
       WHERE id = ?`
    ).run(
      input.protocol ?? "BACnet/IP",
      input.vendor ?? null,
      input.host ?? null,
      input.port ?? null,
      input.authType ?? null,
      ingestToken,
      input.runtimeMode ?? "outbox",
      input.commandEndpoint ?? null,
      input.metadataJson ?? null,
      pollIntervalSeconds,
      nextPollDueAt,
      "configured",
      now,
      gatewayId
    );
  } else {
    db.prepare(
      `INSERT INTO bacnet_gateways (
        id, building_id, name, protocol, vendor, host, port, status, auth_type, ingest_token, runtime_mode, command_endpoint, metadata_json, poll_interval_seconds, next_poll_due_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      gatewayId,
      input.buildingId,
      input.name,
      input.protocol ?? "BACnet/IP",
      input.vendor ?? null,
      input.host ?? null,
      input.port ?? null,
      "configured",
      input.authType ?? null,
      ingestToken,
      input.runtimeMode ?? "outbox",
      input.commandEndpoint ?? null,
      input.metadataJson ?? null,
      pollIntervalSeconds,
      nextPollDueAt,
      now
    );
  }

  recordAuditEvent({
    buildingId: input.buildingId,
    entityType: "bacnet_gateway",
    entityId: gatewayId,
    action: existing ? "gateway_updated" : "gateway_registered",
    actorType: "operator",
    summary: `${input.name} gateway was ${existing ? "updated" : "registered"} for BACnet discovery.`,
    metadataJson: JSON.stringify({
      protocol: input.protocol ?? "BACnet/IP",
      vendor: input.vendor ?? null,
      host: input.host ?? null,
      port: input.port ?? null,
      runtimeMode: input.runtimeMode ?? "outbox",
      commandEndpoint: input.commandEndpoint ?? null,
      pollIntervalSeconds
    })
  });

  return listBacnetGatewaysByBuildingId(input.buildingId).find((gateway) => gateway.id === gatewayId) ?? null;
}

export function updateBacnetGatewayConfiguration(input: {
  gatewayId: string;
  bridgeBackend?: string;
  sdkModulePath?: string;
  sdkExportName?: string;
  sdkConfigJson?: string;
  dispatchTimeoutSeconds?: number;
  maxDispatchAttempts?: number;
}) {
  const gateway = getBacnetGatewayById(input.gatewayId);
  if (!gateway) {
    throw new Error(`Gateway ${input.gatewayId} not found.`);
  }

  const validation = validateGatewayConfigurationInput({
    bridgeBackend: input.bridgeBackend,
    sdkModulePath: input.sdkModulePath,
    sdkExportName: input.sdkExportName,
    sdkConfigJson: input.sdkConfigJson
  });
  const existingMetadata = getGatewayMetadata(gateway);
  const metadata = {
    ...existingMetadata,
    bridgeBackend: validation.bridgeBackend,
    sdkModulePath: input.sdkModulePath?.trim() || null,
    sdkExportName: input.sdkExportName?.trim() || "createBacnetSdkProvider",
    sdkConfigJson: input.sdkConfigJson?.trim() || "",
    dispatchPolicy: {
      timeoutSeconds:
        input.dispatchTimeoutSeconds && Number.isFinite(input.dispatchTimeoutSeconds)
          ? Math.max(30, Math.round(input.dispatchTimeoutSeconds))
          : getGatewayDispatchPolicy(gateway).timeoutSeconds,
      maxAttempts:
        input.maxDispatchAttempts && Number.isFinite(input.maxDispatchAttempts)
          ? Math.max(1, Math.round(input.maxDispatchAttempts))
          : getGatewayDispatchPolicy(gateway).maxAttempts
    },
    configValidation: {
      status: validation.status,
      issues: validation.issues,
      warnings: validation.warnings,
      validatedAt: validation.validatedAt,
      summary: {
        pointCount: validation.pointCount,
        writablePointCount: validation.writablePointCount,
        whitelistedPointCount: validation.whitelistedPointCount
      }
    }
  };

  getDatabase()
    .prepare(`UPDATE bacnet_gateways SET metadata_json = ?, last_seen_at = COALESCE(last_seen_at, ?) WHERE id = ?`)
    .run(JSON.stringify(metadata), new Date().toISOString(), input.gatewayId);

  recordAuditEvent({
    buildingId: gateway.buildingId,
    entityType: "bacnet_gateway",
    entityId: gateway.id,
    action: "gateway_configuration_updated",
    actorType: "operator",
    summary: `${gateway.name} gateway configuration was updated.`,
    metadataJson: JSON.stringify({
      bridgeBackend: validation.bridgeBackend,
      validationStatus: validation.status,
      pointCount: validation.pointCount,
      writablePointCount: validation.writablePointCount,
      whitelistedPointCount: validation.whitelistedPointCount
    })
  });

  return getBacnetGatewayById(gateway.id);
}

export function replayMonitoringScenario(input: {
  buildingId: string;
  gatewayId?: string;
  scenario?: string;
  observedAt?: string;
}) {
  const scenario = normalizeReplayScenario(input.scenario);
  const observedAt = input.observedAt?.trim() || defaultReplayObservedAt(scenario);
  const existingGateway = input.gatewayId
    ? getBacnetGatewayById(input.gatewayId)
    : listBacnetGatewaysByBuildingId(input.buildingId)[0];
  const gateway =
    existingGateway ??
    registerBacnetGateway({
      buildingId: input.buildingId,
      name: "Replay BACnet Gateway",
      protocol: "BACnet/IP",
      vendor: "AirWise Replay",
      host: "127.0.0.1",
      port: 47808,
      runtimeMode: "outbox"
    });

  if (!gateway?.ingestToken) {
    throw new Error("Replay requires a gateway with an ingest token.");
  }

  const snapshot = buildReplaySnapshot(addSecondsToIso(observedAt, -5 * 60));
  const discoveryRun = ingestBacnetGatewayDiscoverySnapshot({
    buildingId: input.buildingId,
    gatewayId: gateway.id,
    observedAt: snapshot.observedAt,
    assets: snapshot.assets
  });

  const eventBatches = buildReplayScenarioEvents(scenario, observedAt);
  let acceptedCount = 0;
  let ignoredCount = 0;
  for (const batch of eventBatches) {
    const result = ingestBacnetGatewayTelemetry({
      gatewayId: gateway.id,
      token: gateway.ingestToken,
      observedAt: batch.observedAt,
      events: batch.events
    });
    acceptedCount += result.acceptedCount;
    ignoredCount += result.ignoredCount;
  }

  const currentGateway = getBacnetGatewayById(gateway.id) ?? gateway;
  const metadata = {
    ...getGatewayMetadata(currentGateway),
    replayProfile: {
      lastScenario: scenario,
      lastObservedAt: observedAt,
      lastReplayAt: new Date().toISOString(),
      acceptedCount,
      ignoredCount
    }
  };
  getDatabase().prepare(`UPDATE bacnet_gateways SET metadata_json = ? WHERE id = ?`).run(JSON.stringify(metadata), gateway.id);

  const monitoring = getMonitoringWorkspaceByBuildingId(input.buildingId);
  const activeIssueTypes = Array.from(new Set(monitoring.issues.map((issue) => issue.issueType)));

  return {
    gatewayId: gateway.id,
    scenario,
    observedAt,
    acceptedCount,
    ignoredCount,
    discoveryRunId: discoveryRun.id,
    activeIssueTypes,
    issueCount: activeIssueTypes.length
  };
}

export function listMonitoringAssetsByBuildingId(buildingId: string): MonitoringAssetRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, system_name, asset_type, protocol, vendor, location, status, source_gateway_id, source_asset_key
       FROM monitoring_assets
       WHERE building_id = ?
       ORDER BY system_name ASC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        system_name: string;
        asset_type: string;
        protocol: string;
        vendor: string | null;
        location: string | null;
        status: string;
        source_gateway_id: string | null;
        source_asset_key: string | null;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        systemName: typedRow.system_name,
        assetType: typedRow.asset_type,
        protocol: typedRow.protocol,
        vendor: typedRow.vendor ?? undefined,
        location: typedRow.location ?? undefined,
        status: typedRow.status,
        sourceGatewayId: typedRow.source_gateway_id ?? undefined,
        sourceAssetKey: typedRow.source_asset_key ?? undefined
      };
    });
}

export function listGatewayDiscoveryRunsByBuildingId(buildingId: string): DiscoveryRunRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, gateway_id, asset_count, point_count, telemetry_event_count, status, summary_json
       FROM bacnet_gateway_discovery_runs
       WHERE building_id = ?
       ORDER BY started_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        gateway_id: string;
        asset_count: number;
        point_count: number;
        telemetry_event_count: number;
        status: string;
        summary_json: string | null;
      };
      const summary = parseJsonObject(typedRow.summary_json);

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        assetId: typeof summary.assetId === "string" ? summary.assetId : "",
        pointId: typeof summary.pointId === "string" ? summary.pointId : "",
        gatewayId: typedRow.gateway_id,
        assetCount: typedRow.asset_count,
        pointCount: typedRow.point_count,
        telemetryEventCount: typedRow.telemetry_event_count,
        status:
          typedRow.status === "completed" || typedRow.status === "failed"
            ? typedRow.status
            : "queued"
      };
    });
}

export function listGatewayCommandDispatchesByBuildingId(buildingId: string): GatewayCommandDispatchRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, gateway_id, command_id, building_id, point_id, status, payload_json, response_json, error_message, created_at, dispatched_at, acknowledged_at,
              delivery_attempt_count, last_delivery_attempt_at
       FROM gateway_command_dispatches
       WHERE building_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        gateway_id: string;
        command_id: string;
        building_id: string;
        point_id: string;
        status: string;
        payload_json: string;
        response_json: string | null;
        error_message: string | null;
        created_at: string;
        dispatched_at: string | null;
        acknowledged_at: string | null;
        delivery_attempt_count: number;
        last_delivery_attempt_at: string | null;
      };

      return {
        id: typedRow.id,
        gatewayId: typedRow.gateway_id,
        commandId: typedRow.command_id,
        buildingId: typedRow.building_id,
        pointId: typedRow.point_id,
        status: typedRow.status,
        payloadJson: typedRow.payload_json,
        responseJson: typedRow.response_json ?? undefined,
        errorMessage: typedRow.error_message ?? undefined,
        createdAt: typedRow.created_at,
        dispatchedAt: typedRow.dispatched_at ?? undefined,
        acknowledgedAt: typedRow.acknowledged_at ?? undefined,
        deliveryAttemptCount: typedRow.delivery_attempt_count,
        lastDeliveryAttemptAt: typedRow.last_delivery_attempt_at ?? undefined
      };
    });
}

function resolveGatewayPoint(input: {
  gatewayId: string;
  assetKey?: string;
  pointKey?: string;
  objectIdentifier?: string;
}) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT bp.id AS point_id, ma.id AS asset_id, ma.building_id
       FROM bas_points bp
       INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
       WHERE ma.source_gateway_id = ?
         AND (
           (? IS NOT NULL AND ma.source_asset_key = ? AND bp.source_point_key = ?)
           OR (? IS NOT NULL AND ma.source_asset_key = ? AND bp.object_identifier = ?)
           OR (? IS NOT NULL AND bp.source_point_key = ?)
           OR (? IS NOT NULL AND bp.object_identifier = ?)
         )
       ORDER BY
         CASE
           WHEN ? IS NOT NULL AND ma.source_asset_key = ? AND bp.source_point_key = ? THEN 1
           WHEN ? IS NOT NULL AND ma.source_asset_key = ? AND bp.object_identifier = ? THEN 2
           WHEN ? IS NOT NULL AND bp.source_point_key = ? THEN 3
           WHEN ? IS NOT NULL AND bp.object_identifier = ? THEN 4
           ELSE 5
         END
       LIMIT 1`
    )
    .get(
      input.gatewayId,
      input.assetKey ?? null,
      input.assetKey ?? null,
      input.pointKey ?? null,
      input.assetKey ?? null,
      input.assetKey ?? null,
      input.objectIdentifier ?? null,
      input.pointKey ?? null,
      input.pointKey ?? null,
      input.objectIdentifier ?? null,
      input.objectIdentifier ?? null,
      input.assetKey ?? null,
      input.assetKey ?? null,
      input.pointKey ?? null,
      input.assetKey ?? null,
      input.assetKey ?? null,
      input.objectIdentifier ?? null,
      input.pointKey ?? null,
      input.pointKey ?? null,
      input.objectIdentifier ?? null,
      input.objectIdentifier ?? null
    ) as
    | {
        point_id: string;
        asset_id: string;
        building_id: string;
      }
    | undefined;

  return row
    ? {
        pointId: row.point_id,
        assetId: row.asset_id,
        buildingId: row.building_id
      }
    : null;
}

export function createAppSessionForUser(input: { email: string; membershipId?: string }) {
  const db = getDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  const user = db
    .prepare(`SELECT id, name, email, status FROM app_users WHERE LOWER(email) = ? LIMIT 1`)
    .get(normalizedEmail) as
    | {
        id: string;
        name: string;
        email: string;
        status: string;
      }
    | undefined;

  if (!user || user.status !== "active") {
    throw new Error(`No active AirWise user exists for ${input.email}.`);
  }

  const memberships = mapPortfolioMembershipRows(user.id);
  if (memberships.length === 0) {
    throw new Error(`User ${input.email} does not have access to any portfolio.`);
  }

  const activeMembership =
    memberships.find((membership) => membership.id === input.membershipId) ?? memberships[0];
  const sessionId = makeId("session");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO app_sessions (id, user_id, active_membership_id, status, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(sessionId, user.id, activeMembership?.id ?? null, "active", now, now, expiresAt);

  return getAppSessionById(sessionId);
}

export function getAppSessionById(sessionId: string): AppSessionRecord | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT s.id, s.user_id, s.active_membership_id, s.status, s.created_at, s.last_seen_at, s.expires_at,
              u.name AS user_name, u.email AS user_email, u.status AS user_status
       FROM app_sessions s
       INNER JOIN app_users u ON u.id = s.user_id
       WHERE s.id = ? AND s.status = 'active'
       LIMIT 1`
    )
    .get(sessionId) as
    | {
        id: string;
        user_id: string;
        active_membership_id: string | null;
        status: string;
        created_at: string;
        last_seen_at: string | null;
        expires_at: string | null;
        user_name: string;
        user_email: string;
        user_status: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`UPDATE app_sessions SET status = 'expired' WHERE id = ?`).run(sessionId);
    return null;
  }

  db.prepare(`UPDATE app_sessions SET last_seen_at = ? WHERE id = ?`).run(new Date().toISOString(), sessionId);
  return buildSessionRecord(row);
}

export function endAppSession(sessionId: string) {
  const db = getDatabase();
  db.prepare(`UPDATE app_sessions SET status = 'ended', last_seen_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    sessionId
  );
}

export function switchAppSessionMembership(input: { sessionId: string; membershipId: string }) {
  const db = getDatabase();
  const session = getAppSessionById(input.sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  const membership = session.memberships.find((item) => item.id === input.membershipId);
  if (!membership) {
    throw new Error("Membership does not belong to the current user.");
  }

  db.prepare(`UPDATE app_sessions SET active_membership_id = ?, last_seen_at = ? WHERE id = ?`).run(
    membership.id,
    new Date().toISOString(),
    input.sessionId
  );

  return getAppSessionById(input.sessionId);
}

export function createPortfolio(input: { name: string; ownerName?: string }) {
  const db = getDatabase();
  const portfolio = {
    id: makeId("pf"),
    name: input.name,
    ownerName: input.ownerName,
    timezone: "America/New_York",
    status: "active"
  };

  db.prepare(
    `INSERT INTO portfolios (id, name, owner_name, timezone, status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(portfolio.id, portfolio.name, portfolio.ownerName ?? null, portfolio.timezone, portfolio.status);

  recordAuditEvent({
    entityType: "portfolio",
    entityId: portfolio.id,
    action: "portfolio_created",
    actorType: "owner",
    summary: `Portfolio ${portfolio.name} was created.`,
    metadataJson: JSON.stringify({ ownerName: portfolio.ownerName ?? null })
  });

  return portfolio;
}

export function getBuildingById(id: string): Building {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, portfolio_id, name, address_line_1, city, state, zip, bbl, bin, dof_gsf, reported_gfa, pathway, article,
              bas_present, bas_vendor, bas_protocol, bas_access_state, point_list_available, schedules_available,
              ventilation_system_archetype, equipment_inventory_status
       FROM buildings
       WHERE id = ?`
    )
    .get(id) as
    | {
        id: string;
        portfolio_id: string;
        name: string;
        address_line_1: string;
        city: string;
        state: string;
        zip: string;
        bbl: string | null;
        bin: string | null;
        dof_gsf: number | null;
        reported_gfa: number | null;
        pathway: CompliancePathway | null;
        article: "320" | "321" | null;
        bas_present: BuildingAvailability | null;
        bas_vendor: string | null;
        bas_protocol: BuildingBasProtocol | null;
        bas_access_state: BuildingBasAccessState | null;
        point_list_available: BuildingAvailability | null;
        schedules_available: BuildingAvailability | null;
        ventilation_system_archetype: VentilationSystemArchetype | null;
        equipment_inventory_status: EquipmentInventoryStatus | null;
      }
    | undefined;

  if (!row) {
    throw new Error(`Building not found: ${id}`);
  }

  const coverage = db
    .prepare(
      `SELECT source_name, source_version, confidence_score
       FROM coverage_records
       WHERE building_id = ?
       ORDER BY filing_year DESC
       LIMIT 1`
    )
    .get(id) as
    | {
        source_name: string | null;
        source_version: string | null;
        confidence_score: number | null;
      }
    | undefined;

  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    name: row.name,
    addressLine1: row.address_line_1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    bbl: row.bbl ?? undefined,
    bin: row.bin ?? undefined,
    grossSquareFeet: row.dof_gsf ?? undefined,
    grossFloorArea: row.reported_gfa ?? undefined,
    pathway: row.pathway ?? "UNKNOWN",
    article: row.article ?? "UNKNOWN",
    basPresent: row.bas_present ?? "unknown",
    basVendor: row.bas_vendor ?? undefined,
    basProtocol: row.bas_protocol ?? "unknown",
    basAccessState: row.bas_access_state ?? "unknown",
    pointListAvailable: row.point_list_available ?? "unknown",
    schedulesAvailable: row.schedules_available ?? "unknown",
    ventilationSystemArchetype: row.ventilation_system_archetype ?? "unknown",
    equipmentInventoryStatus: row.equipment_inventory_status ?? "unknown",
    status: "active",
    source: {
      sourceType: "public",
      sourceRef: coverage?.source_name ?? "Imported owner data",
      sourceVersion: coverage?.source_version ?? undefined,
      confidenceScore: coverage?.confidence_score ?? 0.5
    }
  };
}

export function listBuildingsForPortfolio(portfolioId: string): Building[] {
  const db = getDatabase();
  const rows = db
    .prepare(`SELECT id FROM buildings WHERE portfolio_id = ? ORDER BY name ASC`)
    .all(portfolioId) as Array<{ id: string }>;

  return rows.map((row) => getBuildingById(row.id));
}

export function updateBuildingBasProfile(input: UpdateBuildingBasProfileInput): Building {
  const db = getDatabase();
  const current = getBuildingById(input.buildingId);
  const next = {
    basPresent: input.basPresent ?? current.basPresent,
    basVendor: input.basVendor ?? current.basVendor ?? null,
    basProtocol: input.basProtocol ?? current.basProtocol,
    basAccessState: input.basAccessState ?? current.basAccessState,
    pointListAvailable: input.pointListAvailable ?? current.pointListAvailable,
    schedulesAvailable: input.schedulesAvailable ?? current.schedulesAvailable,
    ventilationSystemArchetype: input.ventilationSystemArchetype ?? current.ventilationSystemArchetype,
    equipmentInventoryStatus: input.equipmentInventoryStatus ?? current.equipmentInventoryStatus
  };

  db.prepare(
    `UPDATE buildings
     SET
       bas_present = ?,
       bas_vendor = ?,
       bas_protocol = ?,
       bas_access_state = ?,
       point_list_available = ?,
       schedules_available = ?,
       ventilation_system_archetype = ?,
       equipment_inventory_status = ?
     WHERE id = ?`
  ).run(
    next.basPresent,
    next.basVendor,
    next.basProtocol,
    next.basAccessState,
    next.pointListAvailable,
    next.schedulesAvailable,
    next.ventilationSystemArchetype,
    next.equipmentInventoryStatus,
    input.buildingId
  );

  recordAuditEvent({
    buildingId: input.buildingId,
    entityType: "building",
    entityId: input.buildingId,
    action: "building_bas_profile_updated",
    actorType: input.actorType ?? "owner",
    summary: `BAS readiness profile updated for ${current.name}.`,
    metadataJson: JSON.stringify(next)
  });

  return getBuildingById(input.buildingId);
}

function getCoverageSnapshot(buildingId: string) {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT covered_status, source_version
       FROM coverage_records
       WHERE building_id = ?
       ORDER BY filing_year DESC
       LIMIT 1`
    )
    .get(buildingId) as
    | {
        covered_status: string | null;
        source_version: string | null;
      }
    | undefined;
}

function ensureReportingCycleRecord(buildingId: string, reportingYear: number) {
  const db = getDatabase();
  const building = getBuildingById(buildingId);
  const coverage = getCoverageSnapshot(buildingId);
  const existing = db
    .prepare(
      `SELECT id, extension_requested, filing_due_date, extended_due_date, filing_status, cbl_dispute_status, owner_of_record_status
       FROM reporting_cycles
       WHERE building_id = ? AND reporting_year = ?`
    )
    .get(buildingId, reportingYear) as
    | {
        id: string;
        extension_requested: number;
        filing_due_date: string;
        extended_due_date: string | null;
        filing_status: ReportingCycleStatus;
        cbl_dispute_status: string | null;
        owner_of_record_status: OwnerRecordMatchStatus;
      }
    | undefined;
  const extensionRequested = Boolean(existing?.extension_requested ?? 0);
  const filingDueDate = getReportingDueDate(reportingYear, extensionRequested);

  if (!existing) {
    const cycleId = makeId("cycle");
    db.prepare(
      `INSERT INTO reporting_cycles (
        id, building_id, reporting_year, filing_status, extension_requested, filing_due_date, extended_due_date, pathway_snapshot, article_snapshot, cbl_version, cbl_dispute_status, owner_of_record_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      cycleId,
      buildingId,
      reportingYear,
      "draft",
      0,
      filingDueDate,
      reportingYear === 2026 ? defaultExtendedDueDate : `${reportingYear}-08-29`,
      building.pathway === "UNKNOWN" ? null : building.pathway,
      building.article === "UNKNOWN" ? null : building.article,
      coverage?.source_version ?? `${reportingYear}`,
      "not_disputed",
      "unknown"
    );

    recordAuditEvent({
      buildingId,
      entityType: "reporting_cycle",
      entityId: cycleId,
      action: "reporting_cycle_created",
      actorType: "system",
      summary: `Reporting cycle ${reportingYear} was initialized for filing intake.`,
      metadataJson: JSON.stringify({ reportingYear, article: building.article, pathway: building.pathway })
    });

    return cycleId;
  }

  db.prepare(
    `UPDATE reporting_cycles
     SET filing_due_date = ?, pathway_snapshot = ?, article_snapshot = ?, cbl_version = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    filingDueDate,
    building.pathway === "UNKNOWN" ? null : building.pathway,
    building.article === "UNKNOWN" ? null : building.article,
    coverage?.source_version ?? `${reportingYear}`,
    existing.id
  );

  return existing.id;
}

function ensureReportingInputPackage(reportingCycleId: string) {
  const db = getDatabase();
  const existing = db
    .prepare(`SELECT id, package_status FROM reporting_input_packages WHERE reporting_cycle_id = ?`)
    .get(reportingCycleId) as { id: string; package_status: ReportingPackageStatus } | undefined;

  if (existing) {
    return existing.id;
  }

  const packageId = makeId("pkg");
  db.prepare(
    `INSERT INTO reporting_input_packages (id, reporting_cycle_id, package_status)
     VALUES (?, ?, ?)`
  ).run(packageId, reportingCycleId, "draft");
  return packageId;
}

function ensureReportingCycleDefaults(buildingId: string, reportingYear: number) {
  const db = getDatabase();
  const building = getBuildingById(buildingId);
  const reportingCycleId = ensureReportingCycleRecord(buildingId, reportingYear);
  const packageId = ensureReportingInputPackage(reportingCycleId);
  const cycle = db
    .prepare(
      `SELECT extension_requested
       FROM reporting_cycles
       WHERE id = ?`
    )
    .get(reportingCycleId) as { extension_requested: number } | undefined;
  const extensionRequested = Boolean(cycle?.extension_requested ?? 0);
  const moduleDueDate = getReportingDueDate(reportingYear, extensionRequested);
  const modules: Array<{ type: FilingModuleType; status: FilingModuleStatus; dueDate: string; prerequisiteState: string }> = [
    {
      type: getCoreModuleTypeForArticle(building.article),
      status: "active",
      dueDate: moduleDueDate,
      prerequisiteState: "ready"
    },
    { type: "extension", status: "inactive", dueDate: getExtensionDueDate(reportingYear), prerequisiteState: "ready" },
    { type: "deductions", status: "inactive", dueDate: moduleDueDate, prerequisiteState: "requires_core_report" },
    { type: "adjustment_320_7", status: "inactive", dueDate: moduleDueDate, prerequisiteState: "requires_core_report" },
    { type: "adjustment_320_8_320_9", status: "inactive", dueDate: moduleDueDate, prerequisiteState: "requires_core_report" },
    { type: "penalty_mitigation", status: "inactive", dueDate: moduleDueDate, prerequisiteState: "requires_core_report" }
  ];

  for (const module of modules) {
    const existing = db
      .prepare(`SELECT id FROM filing_modules WHERE reporting_cycle_id = ? AND module_type = ?`)
      .get(reportingCycleId, module.type) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE filing_modules
         SET due_date = ?, prerequisite_state = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(module.dueDate, module.prerequisiteState, existing.id);
    } else {
      db.prepare(
        `INSERT INTO filing_modules (id, reporting_cycle_id, module_type, status, due_date, prerequisite_state)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(makeId("mod"), reportingCycleId, module.type, module.status, module.dueDate, module.prerequisiteState);
    }
  }

  const attestationRoles: AttestationRole[] = ["owner", "rdp", "rcxa"];
  for (const role of attestationRoles) {
    const existing = db
      .prepare(`SELECT id FROM attestations WHERE reporting_cycle_id = ? AND role = ?`)
      .get(reportingCycleId, role) as { id: string } | undefined;

    if (!existing) {
      db.prepare(
        `INSERT INTO attestations (id, reporting_cycle_id, role, owner_of_record_match_status, completion_status)
         VALUES (?, ?, ?, ?, ?)`
      ).run(makeId("att"), reportingCycleId, role, "unknown", "pending");
    }
  }

  if (building.article === "321") {
    for (const [index, label] of pecmCatalog.entries()) {
      const pecmKey = `pecm_${String(index + 1).padStart(2, "0")}`;
      const existing = db
        .prepare(`SELECT id FROM article_321_pecm_statuses WHERE reporting_cycle_id = ? AND pecm_key = ?`)
        .get(reportingCycleId, pecmKey) as { id: string } | undefined;

      if (!existing) {
        db.prepare(
          `INSERT INTO article_321_pecm_statuses (
            id, reporting_cycle_id, pecm_key, pecm_label, applicability, compliance_status, evidence_state, reviewer_role
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(makeId("pecm"), reportingCycleId, pecmKey, label, "unknown", "unknown", "missing", article321ReviewerRole);
      }
    }
  }

  const coverage = getCoverageSnapshot(buildingId);
  const baselineValues: Array<{ fieldKey: string; value: unknown; sourceType: ReportingInputSourceType; sourceRef: string }> = [
    { fieldKey: "bbl", value: building.bbl ?? "", sourceType: "public_record", sourceRef: "building_record" },
    { fieldKey: "bin", value: building.bin ?? "", sourceType: "public_record", sourceRef: "building_record" },
    {
      fieldKey: "address",
      value: `${building.addressLine1}, ${building.city}, ${building.state} ${building.zip}`,
      sourceType: "public_record",
      sourceRef: "building_record"
    },
    { fieldKey: "reporting_year", value: reportingYear, sourceType: "carryforward", sourceRef: "reporting_cycle" },
    { fieldKey: "article", value: building.article, sourceType: "public_record", sourceRef: "coverage_snapshot" },
    { fieldKey: "pathway", value: building.pathway, sourceType: "public_record", sourceRef: "coverage_snapshot" },
    {
      fieldKey: "covered_status",
      value: coverage?.covered_status ?? (building.pathway === "UNKNOWN" ? "unknown" : "covered"),
      sourceType: "public_record",
      sourceRef: "coverage_snapshot"
    },
    {
      fieldKey: "cbl_version",
      value: coverage?.source_version ?? `${reportingYear}`,
      sourceType: "public_record",
      sourceRef: "coverage_snapshot"
    }
  ];

  for (const entry of baselineValues) {
    const exists = db
      .prepare(
        `SELECT id
         FROM input_values
         WHERE package_id = ? AND field_key = ? AND review_status = 'accepted'
         LIMIT 1`
      )
      .get(packageId, entry.fieldKey) as { id: string } | undefined;

    if (!exists && entry.value !== "") {
      db.prepare(
        `INSERT INTO input_values (
          id, package_id, field_key, value_json, source_type, source_ref, confidence_score, review_status, reviewed_by, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        makeId("inp"),
        packageId,
        entry.fieldKey,
        serializeJson(entry.value),
        entry.sourceType,
        entry.sourceRef,
        0.95,
        "accepted",
        "system",
        new Date().toISOString()
      );
    }
  }

  return { reportingCycleId, packageId };
}

function getReportingCycleById(reportingCycleId: string): ReportingCycle {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, building_id, reporting_year, filing_status, extension_requested, filing_due_date, extended_due_date, pathway_snapshot, article_snapshot, cbl_version, cbl_dispute_status, owner_of_record_status
       FROM reporting_cycles
       WHERE id = ?`
    )
    .get(reportingCycleId) as
    | {
        id: string;
        building_id: string;
        reporting_year: number;
        filing_status: ReportingCycleStatus;
        extension_requested: number;
        filing_due_date: string;
        extended_due_date: string | null;
        pathway_snapshot: CompliancePathway | null;
        article_snapshot: "320" | "321" | null;
        cbl_version: string | null;
        cbl_dispute_status: string | null;
        owner_of_record_status: OwnerRecordMatchStatus;
      }
    | undefined;

  if (!row) {
    throw new Error(`Reporting cycle not found: ${reportingCycleId}`);
  }

  return {
    id: row.id,
    buildingId: row.building_id,
    reportingYear: row.reporting_year,
    filingStatus: row.filing_status,
    extensionRequested: Boolean(row.extension_requested),
    filingDueDate: row.filing_due_date,
    extendedDueDate: row.extended_due_date ?? undefined,
    pathwaySnapshot: row.pathway_snapshot ?? "UNKNOWN",
    articleSnapshot: row.article_snapshot ?? "UNKNOWN",
    cblVersion: row.cbl_version ?? undefined,
    cblDisputeStatus: row.cbl_dispute_status ?? undefined,
    ownerOfRecordStatus: row.owner_of_record_status
  };
}

function getReportingInputPackageByCycleId(reportingCycleId: string): ReportingInputPackage {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, reporting_cycle_id, package_status
       FROM reporting_input_packages
       WHERE reporting_cycle_id = ?`
    )
    .get(reportingCycleId) as
    | {
        id: string;
        reporting_cycle_id: string;
        package_status: ReportingPackageStatus;
      }
    | undefined;

  if (!row) {
    throw new Error(`Reporting input package not found for cycle ${reportingCycleId}`);
  }

  return {
    id: row.id,
    reportingCycleId: row.reporting_cycle_id,
    status: row.package_status
  };
}

export function listReportingInputFieldDefinitions() {
  return reportingFieldDefinitions.map((definition) => ({ ...definition }));
}

export function createOrRefreshReportingCycle(buildingId: string, reportingYear: number) {
  ensureReportingCycleDefaults(buildingId, reportingYear);
  return getReportingWorkspaceByBuildingId(buildingId, reportingYear);
}

export function getReportingWorkspaceByBuildingId(buildingId: string, reportingYear: number): ReportingWorkspace {
  const { reportingCycleId } = ensureReportingCycleDefaults(buildingId, reportingYear);
  return getReportingWorkspaceById(reportingCycleId);
}

export function getReportingWorkspaceById(reportingCycleId: string): ReportingWorkspace {
  const cycle = getReportingCycleById(reportingCycleId);
  const inputPackage = getReportingInputPackageByCycleId(reportingCycleId);
  const modules = listFilingModulesByCycleId(reportingCycleId);
  const documents = listDocumentsByBuildingId(cycle.buildingId).filter(
    (document) => document.reportingYear === undefined || document.reportingYear === cycle.reportingYear
  );
  const extractions = listDocumentExtractionsByDocumentIds(documents.map((document) => document.id));
  const inputValues = listInputValuesByPackageId(inputPackage.id);
  const attestations = listAttestationsByCycleId(reportingCycleId);
  const pecmStatuses = listArticle321PecmStatusesByCycleId(reportingCycleId);
  const latestCalculationRun = getLatestCalculationRunByCycleId(reportingCycleId) ?? undefined;
  const acceptedInputs = getCycleAcceptedInputMap(inputPackage.id);
  const activeModuleTypes = modules
    .filter((module) => module.status === "active" || module.status === "blocked" || module.status === "complete")
    .map((module) => module.moduleType);
  const requiredFieldKeys = getRequiredFieldKeysForActiveModules(cycle.articleSnapshot, acceptedInputs, activeModuleTypes);
  const blockers = [
    ...modules.filter((module) => module.status === "blocked").map((module) => module.blockingReason ?? `${module.moduleType} is blocked.`),
    ...(latestCalculationRun?.missingRequiredInputs.map((fieldKey) => `${fieldKey} is still required.`) ?? []),
    ...(latestCalculationRun?.needsReview.map((fieldKey) => `${fieldKey} still needs review.`) ?? []),
    ...attestations
      .filter((attestation) => attestation.completionStatus === "blocked")
      .map((attestation) => `${attestation.role.toUpperCase()} attestation is blocked by owner-of-record mismatch.`)
  ];

  return {
    cycle,
    inputPackage,
    modules,
    documents,
    inputValues,
    extractions,
    attestations,
    pecmStatuses,
    latestCalculationRun,
    requiredFieldKeys,
    blockers
  };
}

export function upsertReportingInputValue(input: {
  reportingCycleId: string;
  fieldKey: string;
  value: unknown;
  actorType?: AuditActorType;
}) {
  const db = getDatabase();
  const cycle = getReportingCycleById(input.reportingCycleId);
  const inputPackage = getReportingInputPackageByCycleId(input.reportingCycleId);
  const reviewedAt = new Date().toISOString();

  db.prepare(
    `UPDATE input_values
     SET review_status = CASE WHEN review_status = 'accepted' THEN 'rejected' ELSE review_status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE package_id = ? AND field_key = ? AND review_status = 'accepted'`
  ).run(inputPackage.id, input.fieldKey);

  const inputValue = {
    id: makeId("inp"),
    packageId: inputPackage.id,
    fieldKey: input.fieldKey,
    valueJson: serializeJson(input.value),
    sourceType: "manual" as ReportingInputSourceType,
    sourceRef: "manual_entry",
    confidenceScore: 1,
    reviewStatus: "accepted" as ReportingInputReviewStatus,
    reviewedBy: input.actorType ?? "owner",
    reviewedAt
  };

  db.prepare(
    `INSERT INTO input_values (
      id, package_id, field_key, value_json, source_type, source_ref, confidence_score, review_status, reviewed_by, reviewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    inputValue.id,
    inputValue.packageId,
    inputValue.fieldKey,
    inputValue.valueJson,
    inputValue.sourceType,
    inputValue.sourceRef,
    inputValue.confidenceScore,
    inputValue.reviewStatus,
    inputValue.reviewedBy,
    inputValue.reviewedAt
  );

  if (input.fieldKey === "extension_requested") {
    const extensionRequested = isTruthy(input.value);
    const dueDate = getReportingDueDate(cycle.reportingYear, extensionRequested);
    db.prepare(
      `UPDATE reporting_cycles
       SET extension_requested = ?, filing_due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(extensionRequested ? 1 : 0, dueDate, cycle.id);
    db.prepare(
      `UPDATE filing_modules
       SET status = CASE WHEN module_type = 'extension' THEN 'active' ELSE status END,
           due_date = CASE WHEN module_type = 'extension' THEN ? ELSE ? END,
           updated_at = CURRENT_TIMESTAMP
       WHERE reporting_cycle_id = ? AND module_type IN ('extension', ?, ?)`
    ).run(
      getExtensionDueDate(cycle.reportingYear),
      dueDate,
      cycle.id,
      getCoreModuleTypeForArticle(cycle.articleSnapshot),
      "deductions"
    );
  }

  recordAuditEvent({
    buildingId: cycle.buildingId,
    entityType: "reporting_input_value",
    entityId: inputValue.id,
    action: "reporting_input_saved",
    actorType: input.actorType ?? "owner",
    summary: `${input.fieldKey.replaceAll("_", " ")} was saved to the reporting input package.`,
    metadataJson: JSON.stringify({ fieldKey: input.fieldKey, value: input.value })
  });

  return getReportingWorkspaceById(cycle.id);
}

export function reviewReportingInputValue(input: {
  reportingCycleId: string;
  inputValueId: string;
  reviewStatus: ReportingInputReviewStatus;
  actorType?: AuditActorType;
}) {
  const db = getDatabase();
  const cycle = getReportingCycleById(input.reportingCycleId);
  const inputPackage = getReportingInputPackageByCycleId(input.reportingCycleId);
  const existing = db
    .prepare(
      `SELECT id, field_key, value_json
       FROM input_values
       WHERE id = ? AND package_id = ?`
    )
    .get(input.inputValueId, inputPackage.id) as
    | {
        id: string;
        field_key: string;
        value_json: string;
      }
    | undefined;

  if (!existing) {
    throw new Error(`Reporting input value not found: ${input.inputValueId}`);
  }

  if (input.reviewStatus === "accepted") {
    db.prepare(
      `UPDATE input_values
       SET review_status = CASE WHEN review_status = 'accepted' THEN 'rejected' ELSE review_status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE package_id = ? AND field_key = ? AND id != ?`
    ).run(inputPackage.id, existing.field_key, existing.id);
  }

  db.prepare(
    `UPDATE input_values
     SET review_status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(input.reviewStatus, input.actorType ?? "owner", new Date().toISOString(), existing.id);

  recordAuditEvent({
    buildingId: cycle.buildingId,
    entityType: "reporting_input_value",
    entityId: existing.id,
    action: "reporting_input_reviewed",
    actorType: input.actorType ?? "owner",
    summary: `${existing.field_key.replaceAll("_", " ")} was ${input.reviewStatus.replaceAll("_", " ")}.`,
    metadataJson: JSON.stringify({ fieldKey: existing.field_key, reviewStatus: input.reviewStatus })
  });

  return getReportingWorkspaceById(cycle.id);
}

export function activateReportingModule(input: {
  reportingCycleId: string;
  moduleType: FilingModuleType;
  actorType?: AuditActorType;
}) {
  const db = getDatabase();
  const cycle = getReportingCycleById(input.reportingCycleId);
  const dueDate = input.moduleType === "extension" ? getExtensionDueDate(cycle.reportingYear) : cycle.filingDueDate;
  db.prepare(
    `UPDATE filing_modules
     SET status = 'active', due_date = ?, updated_at = CURRENT_TIMESTAMP
     WHERE reporting_cycle_id = ? AND module_type = ?`
  ).run(dueDate, cycle.id, input.moduleType);

  recordAuditEvent({
    buildingId: cycle.buildingId,
    entityType: "filing_module",
    entityId: `${cycle.id}:${input.moduleType}`,
    action: "filing_module_activated",
    actorType: input.actorType ?? "owner",
    summary: `${input.moduleType.replaceAll("_", " ")} module was activated for the reporting cycle.`,
    metadataJson: JSON.stringify({ moduleType: input.moduleType })
  });

  return getReportingWorkspaceById(cycle.id);
}

export function upsertReportingAttestation(input: {
  reportingCycleId: string;
  role: AttestationRole;
  signerName?: string;
  ownerOfRecordMatchStatus: OwnerRecordMatchStatus;
  completionStatus: "pending" | "completed";
  actorType?: AuditActorType;
}) {
  const db = getDatabase();
  const cycle = getReportingCycleById(input.reportingCycleId);
  const existing = db
    .prepare(`SELECT id FROM attestations WHERE reporting_cycle_id = ? AND role = ?`)
    .get(cycle.id, input.role) as { id: string } | undefined;
  const nextStatus =
    input.completionStatus === "completed" && input.ownerOfRecordMatchStatus !== "matched" ? "blocked" : input.completionStatus;
  const completedAt = nextStatus === "completed" ? new Date().toISOString() : null;

  if (existing) {
    db.prepare(
      `UPDATE attestations
       SET signer_name = ?, owner_of_record_match_status = ?, completion_status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(input.signerName ?? null, input.ownerOfRecordMatchStatus, nextStatus, completedAt, existing.id);
  }

  db.prepare(
    `UPDATE reporting_cycles
     SET owner_of_record_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(input.ownerOfRecordMatchStatus, cycle.id);

  recordAuditEvent({
    buildingId: cycle.buildingId,
    entityType: "attestation",
    entityId: existing?.id ?? `${cycle.id}:${input.role}`,
    action: "attestation_updated",
    actorType: input.actorType ?? "owner",
    summary: `${input.role.toUpperCase()} attestation moved to ${nextStatus}.`,
    metadataJson: JSON.stringify({
      role: input.role,
      ownerOfRecordMatchStatus: input.ownerOfRecordMatchStatus,
      completionStatus: nextStatus
    })
  });

  return getReportingWorkspaceById(cycle.id);
}

export function upsertArticle321PecmStatus(input: {
  reportingCycleId: string;
  pecmKey: string;
  applicability: PecmApplicability;
  complianceStatus: PecmComplianceStatus;
  evidenceState: "missing" | "pending_review" | "accepted" | "rejected";
  reviewerRole?: AttestationRole;
  notes?: string;
  actorType?: AuditActorType;
}) {
  const db = getDatabase();
  const cycle = getReportingCycleById(input.reportingCycleId);
  db.prepare(
    `UPDATE article_321_pecm_statuses
     SET applicability = ?, compliance_status = ?, evidence_state = ?, reviewer_role = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE reporting_cycle_id = ? AND pecm_key = ?`
  ).run(
    input.applicability,
    input.complianceStatus,
    input.evidenceState,
    input.reviewerRole ?? article321ReviewerRole,
    input.notes ?? null,
    cycle.id,
    input.pecmKey
  );

  recordAuditEvent({
    buildingId: cycle.buildingId,
    entityType: "article_321_pecm",
    entityId: `${cycle.id}:${input.pecmKey}`,
    action: "article_321_pecm_updated",
    actorType: input.actorType ?? "owner",
    summary: `${input.pecmKey.replaceAll("_", " ")} was updated for the Article 321 workspace.`,
    metadataJson: JSON.stringify(input)
  });

  return getReportingWorkspaceById(cycle.id);
}

export function importBuildings(portfolioId: string, rows: BuildingImportRow[]): BuildingImportResult {
  const db = getDatabase();
  const insert = db.prepare(
    `INSERT INTO buildings (
      id, portfolio_id, name, address_line_1, city, state, zip, bbl, bin, dof_gsf, reported_gfa, article, pathway
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let matched = 0;
  let needsReview = 0;

  for (const row of rows) {
    const id = makeId("bld");
    const name = row.name ?? row.addressLine1 ?? "Imported building";
    const addressLine1 = row.addressLine1 ?? "Needs review";
    const city = row.city ?? "New York";
    const state = row.state ?? "NY";
    const zip = row.zip ?? "00000";

    insert.run(
      id,
      portfolioId,
      name,
      addressLine1,
      city,
      state,
      zip,
      row.bbl ?? null,
      row.bin ?? null,
      row.dofGsf ?? null,
      row.reportedGfa ?? null,
      row.article ?? null,
      row.pathway ?? null
    );

    recordAuditEvent({
      buildingId: id,
      entityType: "building",
      entityId: id,
      action: "building_imported",
      actorType: "owner",
      summary: `Building ${name} was imported into portfolio ${portfolioId}.`,
      metadataJson: JSON.stringify({
        article: row.article ?? null,
        pathway: row.pathway ?? null,
        bbl: row.bbl ?? null,
        bin: row.bin ?? null
      })
    });

    if (row.bbl || row.bin || addressLine1 !== "Needs review") {
      matched += 1;
    } else {
      needsReview += 1;
    }
  }

  return {
    importId: makeId("imp"),
    received: rows.length,
    matched,
    needsReview
  };
}

export function getPortfolioWorkspace(portfolioId: string): PortfolioWorkspace {
  const portfolio = listPortfolios().find((item) => item.id === portfolioId);

  if (!portfolio) {
    throw new Error(`Portfolio not found: ${portfolioId}`);
  }

  const buildings = listBuildingsForPortfolio(portfolioId);
  const pathways = Array.from(new Set(buildings.map((building) => building.pathway))) as CompliancePathway[];
  const primaryPathway = pathways.find((pathway) => pathway !== "UNKNOWN");

  return {
    ...portfolio,
    buildingCount: buildings.length,
    pathways,
    primaryPathwayLabel: primaryPathway ? pathwayMetadata[primaryPathway].label : "Needs pathway review",
    buildings
  };
}

export function listPublicBuildingRecords(datasetName?: string): PublicBuildingRecord[] {
  const db = getDatabase();
  const rows = datasetName
    ? db
        .prepare(
          `SELECT id, dataset_name, source_version, source_record_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
           FROM public_building_records
           WHERE dataset_name = ?
           ORDER BY imported_at DESC, id DESC`
        )
        .all(datasetName)
    : db
        .prepare(
          `SELECT id, dataset_name, source_version, source_record_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
           FROM public_building_records
           ORDER BY imported_at DESC, id DESC`
        )
        .all();

  return rows.map((row) => {
    const typedRow = row as {
      id: string;
      dataset_name: string;
      source_version: string | null;
      source_record_key: string | null;
      address_line_1: string;
      city: string | null;
      state: string | null;
      zip: string | null;
      bbl: string | null;
      bin: string | null;
      covered_status: string | null;
      compliance_pathway: string | null;
      article: string | null;
      gross_sq_ft: number | null;
    };

    return {
      id: typedRow.id,
      datasetName: typedRow.dataset_name,
      sourceVersion: typedRow.source_version ?? undefined,
      sourceRecordKey: typedRow.source_record_key ?? undefined,
      addressLine1: typedRow.address_line_1,
      city: typedRow.city ?? undefined,
      state: typedRow.state ?? undefined,
      zip: typedRow.zip ?? undefined,
      bbl: typedRow.bbl ?? undefined,
      bin: typedRow.bin ?? undefined,
      coveredStatus: typedRow.covered_status ?? undefined,
      compliancePathway: typedRow.compliance_pathway ?? undefined,
      article: typedRow.article ?? undefined,
      grossSquareFeet: typedRow.gross_sq_ft ?? undefined
    };
  });
}

export function listPublicMatchesByBuildingId(buildingId: string): PublicBuildingMatchRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, public_record_id, match_method, confidence_score, status
       FROM building_public_matches
       WHERE building_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        public_record_id: string;
        match_method: string;
        confidence_score: number;
        status: string;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        publicRecordId: typedRow.public_record_id,
        matchMethod: typedRow.match_method,
        confidenceScore: typedRow.confidence_score,
        status: typedRow.status
      };
    });
}

export function findPublicBuildingCandidates(buildingId: string): PublicBuildingRecord[] {
  const db = getDatabase();
  const building = getBuildingById(buildingId);
  const normalizedAddressKey = normalizeAddressKey({
    addressLine1: building.addressLine1,
    city: building.city,
    state: building.state,
    zip: building.zip
  });

  const rows = db
    .prepare(
      `SELECT id, dataset_name, source_version, source_record_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
       FROM public_building_records
       WHERE (bbl IS NOT NULL AND bbl = ?)
          OR (bin IS NOT NULL AND bin = ?)
          OR (normalized_address_key IS NOT NULL AND normalized_address_key = ?)
          OR (LOWER(address_line_1) = LOWER(?) AND LOWER(COALESCE(city, '')) = LOWER(?))
       ORDER BY
         CASE
           WHEN bbl IS NOT NULL AND bbl = ? THEN 1
           WHEN bin IS NOT NULL AND bin = ? THEN 2
           WHEN normalized_address_key IS NOT NULL AND normalized_address_key = ? THEN 3
           ELSE 4
         END,
         imported_at DESC`
    )
    .all(
      building.bbl ?? "",
      building.bin ?? "",
      normalizedAddressKey ?? "",
      building.addressLine1,
      building.city,
      building.bbl ?? "",
      building.bin ?? "",
      normalizedAddressKey ?? ""
    );

  return rows.map((row) => {
    const typedRow = row as {
      id: string;
      dataset_name: string;
      source_version: string | null;
      source_record_key: string | null;
      address_line_1: string;
      city: string | null;
      state: string | null;
      zip: string | null;
      bbl: string | null;
      bin: string | null;
      covered_status: string | null;
      compliance_pathway: string | null;
      article: string | null;
      gross_sq_ft: number | null;
    };

    return {
      id: typedRow.id,
      datasetName: typedRow.dataset_name,
      sourceVersion: typedRow.source_version ?? undefined,
      sourceRecordKey: typedRow.source_record_key ?? undefined,
      addressLine1: typedRow.address_line_1,
      city: typedRow.city ?? undefined,
      state: typedRow.state ?? undefined,
      zip: typedRow.zip ?? undefined,
      bbl: typedRow.bbl ?? undefined,
      bin: typedRow.bin ?? undefined,
      coveredStatus: typedRow.covered_status ?? undefined,
      compliancePathway: typedRow.compliance_pathway ?? undefined,
      article: typedRow.article ?? undefined,
      grossSquareFeet: typedRow.gross_sq_ft ?? undefined
    };
  });
}

export function importPublicBuildingRecords(input: {
  datasetName: string;
  sourceVersion?: string;
  sourceFile?: string;
  rows: Array<{
    addressLine1: string;
    city?: string;
    state?: string;
    zip?: string;
    bbl?: string;
    bin?: string;
    coveredStatus?: string;
    compliancePathway?: string;
    article?: string;
    grossSquareFeet?: number;
    sourceRecordKey?: string;
    sourceRowJson?: string;
  }>;
}) {
  const db = getDatabase();
  const importRunId = makeId("pubrun");
  const insert = db.prepare(
    `INSERT INTO public_building_records (
      id, dataset_name, source_version, source_record_key, normalized_address_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const update = db.prepare(
    `UPDATE public_building_records
     SET address_line_1 = ?, city = ?, state = ?, zip = ?, bbl = ?, bin = ?, covered_status = ?, compliance_pathway = ?, article = ?, gross_sq_ft = ?, source_row_json = ?, normalized_address_key = ?, source_record_key = ?
     WHERE id = ?`
  );
  const selectExistingByRecordKey = db.prepare(
    `SELECT id, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json, normalized_address_key, source_record_key
     FROM public_building_records
     WHERE dataset_name = ? AND COALESCE(source_version, '') = COALESCE(?, '')
       AND source_record_key = ?
     LIMIT 1`
  );
  const selectExistingByIdentity = db.prepare(
    `SELECT id, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json, normalized_address_key, source_record_key
     FROM public_building_records
     WHERE dataset_name = ? AND COALESCE(source_version, '') = COALESCE(?, '')
       AND (
         (? IS NOT NULL AND bbl = ?)
         OR (? IS NOT NULL AND bin = ?)
         OR (? IS NOT NULL AND normalized_address_key = ?)
       )
     ORDER BY
       CASE
         WHEN ? IS NOT NULL AND bbl = ? THEN 1
         WHEN ? IS NOT NULL AND bin = ? THEN 2
         WHEN ? IS NOT NULL AND normalized_address_key = ? THEN 3
         ELSE 4
       END,
       imported_at DESC
     LIMIT 1`
  );
  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  db.prepare(
    `INSERT INTO public_import_runs (
      id, dataset_name, source_version, source_file, row_count, inserted_count, updated_count, skipped_count, status, summary_json, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    importRunId,
    input.datasetName,
    input.sourceVersion ?? null,
    input.sourceFile ?? null,
    input.rows.length,
    0,
    0,
    0,
    "running",
    null,
    null
  );

  try {
    for (const row of input.rows) {
      const addressLine1 = row.addressLine1.trim() || "Unknown address";
      const city = row.city?.trim() || undefined;
      const state = row.state?.trim().toUpperCase() || undefined;
      const trimmedZip = row.zip?.trim();
      const zip = normalizeDigits(trimmedZip) ?? (trimmedZip && trimmedZip.length > 0 ? trimmedZip : undefined);
      const bbl = normalizeDigits(row.bbl);
      const bin = normalizeDigits(row.bin);
      const normalizedAddressKey = normalizeAddressKey({
        addressLine1,
        city,
        state,
        zip
      });
      const compliancePathway = normalizePublicPathwayValue(row.compliancePathway);
      const article = normalizePublicArticleValue(row.article, compliancePathway);
      const coveredStatus =
        normalizeCoveredStatusValue(row.coveredStatus) ??
        (compliancePathway || article ? "covered" : undefined);
      const grossSquareFeet =
        typeof row.grossSquareFeet === "number" && Number.isFinite(row.grossSquareFeet)
          ? row.grossSquareFeet
          : undefined;
      const sourceRecordKey =
        row.sourceRecordKey?.trim() ||
        [bbl, bin, normalizedAddressKey].filter((part) => part && part.length > 0).join("|") ||
        undefined;
      const existing =
        (sourceRecordKey
          ? (selectExistingByRecordKey.get(
              input.datasetName,
              input.sourceVersion ?? null,
              sourceRecordKey
            ) as
              | {
                  id: string;
                  address_line_1: string;
                  city: string | null;
                  state: string | null;
                  zip: string | null;
                  bbl: string | null;
                  bin: string | null;
                  covered_status: string | null;
                  compliance_pathway: string | null;
                  article: string | null;
                  gross_sq_ft: number | null;
                  source_row_json: string | null;
                  normalized_address_key: string | null;
                  source_record_key: string | null;
                }
              | undefined)
          : undefined) ??
        (selectExistingByIdentity.get(
          input.datasetName,
          input.sourceVersion ?? null,
          bbl ?? null,
          bbl ?? null,
          bin ?? null,
          bin ?? null,
          normalizedAddressKey ?? null,
          normalizedAddressKey ?? null,
          bbl ?? null,
          bbl ?? null,
          bin ?? null,
          bin ?? null,
          normalizedAddressKey ?? null,
          normalizedAddressKey ?? null
        ) as
          | {
              id: string;
              address_line_1: string;
              city: string | null;
              state: string | null;
              zip: string | null;
              bbl: string | null;
              bin: string | null;
              covered_status: string | null;
              compliance_pathway: string | null;
              article: string | null;
              gross_sq_ft: number | null;
              source_row_json: string | null;
              normalized_address_key: string | null;
              source_record_key: string | null;
            }
          | undefined);

      if (!existing) {
        insert.run(
          makeId("pub"),
          input.datasetName,
          input.sourceVersion ?? null,
          sourceRecordKey ?? null,
          normalizedAddressKey ?? null,
          addressLine1,
          city ?? null,
          state ?? null,
          zip ?? null,
          bbl ?? null,
          bin ?? null,
          coveredStatus ?? null,
          compliancePathway ?? null,
          article ?? null,
          grossSquareFeet ?? null,
          row.sourceRowJson ?? null
        );
        insertedCount += 1;
        continue;
      }

      const hasChanged =
        existing.address_line_1 !== addressLine1 ||
        (existing.city ?? null) !== (city ?? null) ||
        (existing.state ?? null) !== (state ?? null) ||
        (existing.zip ?? null) !== (zip ?? null) ||
        (existing.bbl ?? null) !== (bbl ?? null) ||
        (existing.bin ?? null) !== (bin ?? null) ||
        (existing.covered_status ?? null) !== (coveredStatus ?? null) ||
        (existing.compliance_pathway ?? null) !== (compliancePathway ?? null) ||
        (existing.article ?? null) !== (article ?? null) ||
        Number(existing.gross_sq_ft ?? 0) !== Number(grossSquareFeet ?? 0) ||
        (existing.source_row_json ?? null) !== (row.sourceRowJson ?? null) ||
        (existing.normalized_address_key ?? null) !== (normalizedAddressKey ?? null) ||
        (existing.source_record_key ?? null) !== (sourceRecordKey ?? null);

      if (!hasChanged) {
        skippedCount += 1;
        continue;
      }

      update.run(
        addressLine1,
        city ?? null,
        state ?? null,
        zip ?? null,
        bbl ?? null,
        bin ?? null,
        coveredStatus ?? null,
        compliancePathway ?? null,
        article ?? null,
        grossSquareFeet ?? null,
        row.sourceRowJson ?? null,
        normalizedAddressKey ?? null,
        sourceRecordKey ?? null,
        existing.id
      );
      updatedCount += 1;
    }
  } catch (error) {
    db.prepare(
      `UPDATE public_import_runs
       SET inserted_count = ?, updated_count = ?, skipped_count = ?, status = ?, summary_json = ?, completed_at = ?
       WHERE id = ?`
    ).run(
      insertedCount,
      updatedCount,
      skippedCount,
      "failed",
      JSON.stringify({
        datasetName: input.datasetName,
        sourceVersion: input.sourceVersion ?? null,
        sourceFile: input.sourceFile ?? null,
        rowCount: input.rows.length,
        insertedCount,
        updatedCount,
        skippedCount,
        error: error instanceof Error ? error.message : String(error)
      }),
      new Date().toISOString(),
      importRunId
    );
    throw error;
  }

  const summary = JSON.stringify({
    datasetName: input.datasetName,
    sourceVersion: input.sourceVersion ?? null,
    sourceFile: input.sourceFile ?? null,
    rowCount: input.rows.length,
    insertedCount,
    updatedCount,
    skippedCount
  });

  db.prepare(
    `UPDATE public_import_runs
     SET inserted_count = ?, updated_count = ?, skipped_count = ?, status = ?, summary_json = ?, completed_at = ?
     WHERE id = ?`
  ).run(
    insertedCount,
    updatedCount,
    skippedCount,
    "completed",
    summary,
    new Date().toISOString(),
    importRunId
  );

  return {
    importRunId,
    datasetName: input.datasetName,
    sourceVersion: input.sourceVersion,
    sourceFile: input.sourceFile,
    importedCount: input.rows.length,
    insertedCount,
    updatedCount,
    skippedCount
  };
}

export function listPublicImportRuns(limit = 20): PublicImportRunRecord[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT id, dataset_name, source_version, source_file, row_count, inserted_count, updated_count, skipped_count, status, summary_json, started_at, completed_at
       FROM public_import_runs
       ORDER BY started_at DESC, id DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => {
      const typedRow = row as {
        id: string;
        dataset_name: string;
        source_version: string | null;
        source_file: string | null;
        row_count: number;
        inserted_count: number;
        updated_count: number;
        skipped_count: number;
        status: string;
        summary_json: string | null;
        started_at: string;
        completed_at: string | null;
      };

      return {
        id: typedRow.id,
        datasetName: typedRow.dataset_name,
        sourceVersion: typedRow.source_version ?? undefined,
        sourceFile: typedRow.source_file ?? undefined,
        rowCount: typedRow.row_count,
        insertedCount: typedRow.inserted_count,
        updatedCount: typedRow.updated_count,
        skippedCount: typedRow.skipped_count,
        status: typedRow.status,
        summaryJson: typedRow.summary_json ?? undefined,
        startedAt: typedRow.started_at,
        completedAt: typedRow.completed_at ?? undefined
      };
    });
}

export function autoMatchPublicBuildingRecord(buildingId: string) {
  const db = getDatabase();
  const building = getBuildingById(buildingId);
  const candidates = findPublicBuildingCandidates(buildingId);
  const candidate = candidates[0];

  if (!candidate) {
    return null;
  }

  const matchMethod =
    candidate.bbl && building.bbl && candidate.bbl === building.bbl
      ? "bbl_exact"
      : candidate.bin && building.bin && candidate.bin === building.bin
        ? "bin_exact"
        : "address_exact";
  const confidenceScore = matchMethod === "bbl_exact" ? 0.98 : matchMethod === "bin_exact" ? 0.92 : 0.78;
  const existing = db
    .prepare(`SELECT id FROM building_public_matches WHERE building_id = ? AND public_record_id = ? LIMIT 1`)
    .get(buildingId, candidate.id) as { id: string } | undefined;
  const id = existing?.id ?? makeId("match");

  if (existing) {
    db.prepare(
      `UPDATE building_public_matches SET match_method = ?, confidence_score = ?, status = ? WHERE id = ?`
    ).run(matchMethod, confidenceScore, "matched", id);
  } else {
    db.prepare(
      `INSERT INTO building_public_matches (id, building_id, public_record_id, match_method, confidence_score, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, buildingId, candidate.id, matchMethod, confidenceScore, "matched");
  }

  recordAuditEvent({
    buildingId,
    entityType: "public_building_match",
    entityId: id,
    action: "public_record_matched",
    actorType: "system",
    summary: `Public record ${candidate.id} was matched using ${matchMethod}.`,
    metadataJson: JSON.stringify({
      publicRecordId: candidate.id,
      datasetName: candidate.datasetName,
      confidenceScore
    })
  });

  return {
    id,
    buildingId,
    publicRecordId: candidate.id,
    matchMethod,
    confidenceScore,
    status: "matched"
  } satisfies PublicBuildingMatchRecord;
}

export function autoMatchPublicBuildingRecordsForAllBuildings() {
  const buildingIds = listBuildingIds();
  const results = buildingIds.map((buildingId) => ({
    buildingId,
    match: autoMatchPublicBuildingRecord(buildingId)
  }));

  return {
    buildingCount: buildingIds.length,
    matchedCount: results.filter((result) => result.match).length,
    results
  };
}

export function getPublicSourceWorkspaceByBuildingId(buildingId: string): PublicSourceWorkspace {
  return {
    candidates: findPublicBuildingCandidates(buildingId),
    matches: listPublicMatchesByBuildingId(buildingId)
  };
}

function getPublicBuildingRecordById(publicRecordId: string): PublicBuildingRecord | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT id, dataset_name, source_version, source_record_key, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
       FROM public_building_records
       WHERE id = ?`
    )
    .get(publicRecordId) as
    | {
        id: string;
        dataset_name: string;
        source_version: string | null;
        source_record_key: string | null;
        address_line_1: string;
        city: string | null;
        state: string | null;
        zip: string | null;
        bbl: string | null;
        bin: string | null;
        covered_status: string | null;
        compliance_pathway: string | null;
        article: string | null;
        gross_sq_ft: number | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    datasetName: row.dataset_name,
    sourceVersion: row.source_version ?? undefined,
    sourceRecordKey: row.source_record_key ?? undefined,
    addressLine1: row.address_line_1,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    zip: row.zip ?? undefined,
    bbl: row.bbl ?? undefined,
    bin: row.bin ?? undefined,
    coveredStatus: row.covered_status ?? undefined,
    compliancePathway: row.compliance_pathway ?? undefined,
    article: row.article ?? undefined,
    grossSquareFeet: row.gross_sq_ft ?? undefined
  };
}

function chooseCoverageSource(buildingId: string) {
  const config = readSeedConfig();
  const building = getBuildingById(buildingId);
  const matches = listPublicMatchesByBuildingId(buildingId);
  const matchedRecord = matches[0] ? getPublicBuildingRecordById(matches[0].publicRecordId) : null;
  const candidate = matchedRecord ?? findPublicBuildingCandidates(buildingId)[0] ?? null;
  const sourcePathway = normalizeCompliancePathway(candidate?.compliancePathway);
  const resolvedPathway = sourcePathway !== "UNKNOWN" ? sourcePathway : building.pathway;
  const sourceArticle = normalizeArticle(candidate?.article) !== "UNKNOWN"
    ? normalizeArticle(candidate?.article)
    : sourcePathway !== "UNKNOWN"
      ? pathwayMetadata[sourcePathway].article
      : building.article;

  const sourceConfidence = matchedRecord
    ? (matches[0]?.matchMethod === "bbl_exact"
        ? config.coverageConfidence.matchedBbl
        : matches[0]?.matchMethod === "bin_exact"
          ? config.coverageConfidence.matchedBin
          : config.coverageConfidence.matchedAddress)
    : candidate
      ? candidate.bbl && building.bbl && candidate.bbl === building.bbl
        ? config.coverageConfidence.matchedBbl
        : candidate.bin && building.bin && candidate.bin === building.bin
          ? config.coverageConfidence.matchedBin
          : config.coverageConfidence.matchedAddress
      : config.coverageConfidence.ownerImported;
  const hasConflict =
    (building.pathway !== "UNKNOWN" && resolvedPathway !== "UNKNOWN" && building.pathway !== resolvedPathway) ||
    (building.article !== "UNKNOWN" && sourceArticle !== "UNKNOWN" && building.article !== sourceArticle);
  const confidenceScore = Math.max(
    0,
    Number((sourceConfidence - (hasConflict ? config.coverageConfidence.conflictPenalty : 0)).toFixed(2))
  );
  const notes = hasConflict
    ? "Public-source pathway conflicts with imported building metadata and should be reviewed."
    : candidate
      ? "Coverage resolved from matched or candidate public-source data."
      : "Coverage resolved from imported owner data; public-source confirmation is still missing.";

  return {
    building,
    candidate,
    resolvedPathway,
    resolvedArticle: sourceArticle,
    confidenceScore,
    coveredStatus: resolvedPathway === "UNKNOWN" ? "unknown" : "covered",
    sourceName: candidate?.datasetName ?? "Imported owner data",
    sourceVersion: candidate?.sourceVersion ?? "owner-import",
    notes
  } as const;
}

export function listBuildingIds(): string[] {
  const db = getDatabase();
  return (db.prepare(`SELECT id FROM buildings ORDER BY name ASC`).all() as Array<{ id: string }>).map((row) => row.id);
}

export function getAppWorkspace(): AppWorkspace {
  const db = getDatabase();
  const firstPortfolio = db
    .prepare(`SELECT id FROM portfolios ORDER BY name ASC LIMIT 1`)
    .get() as { id: string } | undefined;
  const firstBuilding = db
    .prepare(`SELECT id FROM buildings ORDER BY name ASC LIMIT 1`)
    .get() as { id: string } | undefined;

  return {
    portfolioCount: getCount(`SELECT COUNT(*) as count FROM portfolios`),
    buildingCount: getCount(`SELECT COUNT(*) as count FROM buildings`),
    documentCount: getCount(`SELECT COUNT(*) as count FROM documents`),
    commandCount: getCount(`SELECT COUNT(*) as count FROM control_commands`),
    pendingCommandCount: getCount(
      `SELECT COUNT(*) as count FROM control_commands WHERE status = ?`,
      "pending_approval"
    ),
    issueCount: getCount(`SELECT COUNT(*) as count FROM recommendations WHERE status = ?`, "open"),
    firstPortfolioId: firstPortfolio?.id,
    firstBuildingId: firstBuilding?.id
  };
}

function fetchRequirements(buildingId: string): ComplianceRequirement[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT
         cr.id,
         cr.building_id,
         cr.reporting_year,
         cr.requirement_type,
         cr.status,
         cr.due_date,
         cr.required_role,
         cr.blocking_reason,
         COUNT(del.id) AS evidence_link_count,
         SUM(CASE WHEN del.link_status = 'accepted' THEN 1 ELSE 0 END) AS accepted_evidence_count,
         SUM(CASE WHEN del.link_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_evidence_count,
         SUM(CASE WHEN del.link_status = 'pending_review' THEN 1 ELSE 0 END) AS pending_evidence_count
       FROM compliance_requirements
       cr
       LEFT JOIN document_evidence_links del ON del.requirement_id = cr.id
       WHERE cr.building_id = ?
       GROUP BY cr.id, cr.building_id, cr.reporting_year, cr.requirement_type, cr.status, cr.due_date, cr.required_role, cr.blocking_reason
       ORDER BY cr.due_date ASC, cr.requirement_type ASC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        reporting_year: number;
        requirement_type: ComplianceRequirement["type"];
        status: ComplianceRequirement["status"];
        due_date: string;
        required_role: ComplianceRequirement["requiredRole"];
        blocking_reason: string | null;
        evidence_link_count: number | null;
        accepted_evidence_count: number | null;
        rejected_evidence_count: number | null;
        pending_evidence_count: number | null;
      };
      const evidenceLinkCount = Number(typedRow.evidence_link_count ?? 0);
      const acceptedEvidenceCount = Number(typedRow.accepted_evidence_count ?? 0);
      const rejectedEvidenceCount = Number(typedRow.rejected_evidence_count ?? 0);
      const pendingEvidenceCount = Number(typedRow.pending_evidence_count ?? 0);
      const evidenceState =
        acceptedEvidenceCount > 0
          ? "accepted"
          : pendingEvidenceCount > 0
            ? "pending_review"
            : rejectedEvidenceCount > 0
              ? "rejected"
              : "missing";

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        reportingYear: typedRow.reporting_year,
        type: typedRow.requirement_type,
        status: typedRow.status,
        dueDate: typedRow.due_date,
        requiredRole: typedRow.required_role,
        blockingReason: typedRow.blocking_reason ?? undefined,
        evidenceLinkCount,
        acceptedEvidenceCount,
        rejectedEvidenceCount,
        pendingEvidenceCount,
        evidenceState
      };
    });
}

export function getComplianceSummaryByBuildingId(buildingId: string): BuildingComplianceSummary {
  const building = getBuildingById(buildingId);
  const config = readSeedConfig();
  const requirements = fetchRequirements(buildingId);
  const grossFloorArea = building.grossFloorArea ?? building.grossSquareFeet ?? 0;
  const evidenceGapCount = requirements.filter(
    (requirement) => requirement.evidenceState === "missing" || requirement.evidenceState === "rejected"
  ).length;
  const readyRequirementCount = requirements.filter(
    (requirement) => requirement.status === "complete" || requirement.evidenceState === "accepted"
  ).length;
  const estimatedActualEmissions =
    building.article === "320"
      ? grossFloorArea * config.emissionsEstimates.article320.estimatedActualTco2ePerSqFt
      : null;
  const estimatedEmissionsLimit =
    building.article === "320"
      ? grossFloorArea * config.emissionsEstimates.article320.estimatedLimitTco2ePerSqFt
      : null;

  return {
    buildingId,
    pathway: building.pathway,
    article: building.article === "UNKNOWN" ? "320" : building.article,
    requirements,
    blockerCount: requirements.filter((requirement) => requirement.status === "blocked").length,
    evidenceGapCount,
    readyRequirementCount,
    estimatedLateReportPenalty: calculateLateReportPenalty(grossFloorArea, 1),
    estimatedEmissionsOverLimitPenalty:
      estimatedActualEmissions !== null && estimatedEmissionsLimit !== null
        ? calculateEmissionsPenalty(estimatedActualEmissions, estimatedEmissionsLimit)
        : null
  };
}

export function resolveCoverageRecord(
  buildingId: string,
  filingYear = new Date().getUTCFullYear()
): CoverageResolutionRecord {
  const db = getDatabase();
  const sourceDecision = chooseCoverageSource(buildingId);
  const metadata =
    sourceDecision.resolvedPathway === "UNKNOWN" ? null : pathwayMetadata[sourceDecision.resolvedPathway];
  const existing = db
    .prepare(`SELECT id FROM coverage_records WHERE building_id = ? AND filing_year = ? LIMIT 1`)
    .get(buildingId, filingYear) as { id: string } | undefined;
  const coverageRecordId = existing?.id ?? makeId("cov");

  if (existing) {
    db.prepare(
      `UPDATE coverage_records
       SET covered_status = ?, compliance_pathway = ?, pathway_tier = ?, source_name = ?, source_version = ?, source_date = ?, confidence_score = ?, notes = ?
       WHERE id = ?`
    ).run(
      sourceDecision.coveredStatus,
      sourceDecision.resolvedPathway === "UNKNOWN" ? null : sourceDecision.resolvedPathway,
      sourceDecision.resolvedPathway === "UNKNOWN" ? null : sourceDecision.resolvedPathway,
      sourceDecision.sourceName,
      sourceDecision.sourceVersion,
      new Date().toISOString().slice(0, 10),
      sourceDecision.confidenceScore,
      sourceDecision.notes,
      coverageRecordId
    );
  } else {
    db.prepare(
      `INSERT INTO coverage_records (
        id, building_id, filing_year, covered_status, compliance_pathway, pathway_tier, source_name, source_version, source_date, is_disputed, confidence_score, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      coverageRecordId,
      buildingId,
      filingYear,
      sourceDecision.coveredStatus,
      sourceDecision.resolvedPathway === "UNKNOWN" ? null : sourceDecision.resolvedPathway,
      sourceDecision.resolvedPathway === "UNKNOWN" ? null : sourceDecision.resolvedPathway,
      sourceDecision.sourceName,
      sourceDecision.sourceVersion,
      new Date().toISOString().slice(0, 10),
      0,
      sourceDecision.confidenceScore,
      sourceDecision.notes
    );
  }

  db.prepare(`UPDATE buildings SET article = ?, pathway = ? WHERE id = ?`).run(
    sourceDecision.resolvedArticle === "UNKNOWN" ? null : sourceDecision.resolvedArticle,
    sourceDecision.resolvedPathway === "UNKNOWN" ? null : sourceDecision.resolvedPathway,
    buildingId
  );

  recordAuditEvent({
    buildingId,
    entityType: "coverage_record",
    entityId: coverageRecordId,
    action: "coverage_resolved",
    actorType: "system",
    summary: `Coverage was resolved for filing year ${filingYear} using ${sourceDecision.sourceName}.`,
    metadataJson: JSON.stringify({
      filingYear,
      pathway: sourceDecision.resolvedPathway,
      article: sourceDecision.resolvedArticle,
      confidenceScore: sourceDecision.confidenceScore
    })
  });

  return {
    buildingId: sourceDecision.building.id,
    coveredStatus: sourceDecision.coveredStatus,
    pathway: sourceDecision.resolvedPathway,
    article: sourceDecision.resolvedArticle,
    pathwaySummary: metadata?.summary ?? "Needs review",
    confidenceScore: sourceDecision.confidenceScore
  };
}

function determineArticle321Track(buildingId: string): "performance" | "prescriptive" {
  const documents = listDocumentsByBuildingId(buildingId);
  const requirementTypes = fetchRequirements(buildingId).map((requirement) => requirement.type);
  const documentTypes = documents.map((document) => document.documentType.toLowerCase());

  if (
    requirementTypes.includes("article_321_performance_report") ||
    documentTypes.some((type) => type.includes("espm") || type.includes("energy_star") || type.includes("performance"))
  ) {
    return "performance";
  }

  return "prescriptive";
}

function buildRequirementTemplatesForBuilding(buildingId: string) {
  const building = getBuildingById(buildingId);
  const config = readSeedConfig();

  const templates =
    building.article === "321"
      ? determineArticle321Track(buildingId) === "performance"
        ? config.requirementTemplates.article321Performance
        : config.requirementTemplates.article321Prescriptive
      : config.requirementTemplates.article320;

  return templates.map((template) => ({
    type: template.type,
    status: template.status,
    dueDate: getDeadlineForRequirement(config, template.dueDateRef),
    requiredRole: template.requiredRole,
    blockingReason: template.blockingReason ?? null
  }));
}

export function generateComplianceRequirements(buildingId: string, reportingYear: number) {
  const db = getDatabase();
  const existingByType = new Map(
    (
      db
        .prepare(
          `SELECT id, requirement_type
           FROM compliance_requirements
           WHERE building_id = ? AND reporting_year = ?`
        )
        .all(buildingId, reportingYear) as Array<{ id: string; requirement_type: ComplianceRequirement["type"] }>
    ).map((row) => [row.requirement_type, row.id] as const)
  );

  for (const requirement of buildRequirementTemplatesForBuilding(buildingId)) {
    const existingId = existingByType.get(requirement.type);

    if (existingId) {
      db.prepare(
        `UPDATE compliance_requirements
         SET status = ?, due_date = ?, required_role = ?, blocking_reason = ?
         WHERE id = ?`
      ).run(
        requirement.status,
        requirement.dueDate,
        requirement.requiredRole,
        requirement.blockingReason,
        existingId
      );
      continue;
    }

    db.prepare(
      `INSERT INTO compliance_requirements (
        id, building_id, reporting_year, requirement_type, status, due_date, required_role, blocking_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      makeId("req"),
      buildingId,
      reportingYear,
      requirement.type,
      requirement.status,
      requirement.dueDate,
      requirement.requiredRole,
      requirement.blockingReason
    );
  }

  recordAuditEvent({
    buildingId,
    entityType: "compliance_requirement",
    entityId: `${buildingId}:${reportingYear}`,
    action: "requirements_generated",
    actorType: "system",
    summary: `Compliance requirements were generated for reporting year ${reportingYear}.`,
    metadataJson: JSON.stringify({
      reportingYear,
      article321Track: getBuildingById(buildingId).article === "321" ? determineArticle321Track(buildingId) : null
    })
  });

  return {
    buildingId,
    reportingYear,
    requirements: getComplianceSummaryByBuildingId(buildingId).requirements
  };
}

export function getMonitoringIssuesByBuildingId(buildingId: string): MonitoringIssue[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, system_id, issue_type, summary, evidence_json, recommended_action, writeback_eligible, confidence_score, status, assigned_to
       FROM recommendations
       WHERE building_id = ?
       ORDER BY id ASC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        system_id: string | null;
        issue_type: MonitoringIssue["issueType"];
        summary: string;
        evidence_json: string;
        recommended_action: string;
        writeback_eligible: number;
        confidence_score: number;
        status: "open" | "in_progress" | "resolved";
        assigned_to: string | null;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        systemId: typedRow.system_id ?? undefined,
        issueType: typedRow.issue_type,
        summary: typedRow.summary,
        evidenceWindow:
          (JSON.parse(typedRow.evidence_json) as { evidenceWindow?: string }).evidenceWindow ??
          "Unknown window",
        recommendedAction: typedRow.recommended_action,
        writebackEligible: Boolean(typedRow.writeback_eligible),
        confidenceScore: typedRow.confidence_score,
        status: typedRow.status,
        assignedTo: typedRow.assigned_to ?? undefined
      };
    });
}

export function listTelemetryEventsByBuildingId(buildingId: string, limit = 25): TelemetryEventRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, system_id, point_id, timestamp, value_numeric, value_text, unit, quality_flag
       FROM telemetry_events
       WHERE building_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`
    )
    .all(buildingId, limit)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        system_id: string | null;
        point_id: string | null;
        timestamp: string;
        value_numeric: number | null;
        value_text: string | null;
        unit: string | null;
        quality_flag: string | null;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        systemId: typedRow.system_id ?? undefined,
        pointId: typedRow.point_id ?? undefined,
        timestamp: typedRow.timestamp,
        valueNumeric: typedRow.value_numeric ?? undefined,
        valueText: typedRow.value_text ?? undefined,
        unit: typedRow.unit ?? undefined,
        qualityFlag: typedRow.quality_flag ?? undefined
      };
    });
}

function reconcileOpenIssues(buildingId: string, activeIssueTypes: Set<MonitoringIssue["issueType"]>) {
  const db = getDatabase();
  const trackedIssueTypes: MonitoringIssue["issueType"][] = [
    "after_hours_runtime",
    "schedule_mismatch",
    "high_co2_low_ventilation",
    "stale_override",
    "sensor_fault"
  ];
  const existing = db
    .prepare(
      `SELECT id, issue_type, status
       FROM recommendations
       WHERE building_id = ? AND issue_type IN (${trackedIssueTypes.map(() => "?").join(", ")})`
    )
    .all(buildingId, ...trackedIssueTypes) as Array<{
    id: string;
    issue_type: MonitoringIssue["issueType"];
    status: "open" | "in_progress" | "resolved";
  }>;

  for (const issue of existing) {
    if (activeIssueTypes.has(issue.issue_type) || issue.status === "in_progress") {
      continue;
    }

    db.prepare(`UPDATE recommendations SET status = 'resolved' WHERE id = ?`).run(issue.id);
  }
}

export function normalizeTelemetryEvents() {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT te.id, te.point_id, te.system_id, te.unit, bp.monitoring_asset_id, bp.unit AS point_unit
       FROM telemetry_events te
       LEFT JOIN bas_points bp ON bp.id = te.point_id
       WHERE te.point_id IS NOT NULL`
    )
    .all() as Array<{
    id: string;
    point_id: string | null;
    system_id: string | null;
    unit: string | null;
    monitoring_asset_id: string | null;
    point_unit: string | null;
  }>;
  let normalizedCount = 0;

  for (const row of rows) {
    const nextSystemId = row.system_id ?? row.monitoring_asset_id;
    const nextUnit = row.unit ?? row.point_unit;

    if (nextSystemId === row.system_id && nextUnit === row.unit) {
      continue;
    }

    db.prepare(`UPDATE telemetry_events SET system_id = ?, unit = ? WHERE id = ?`).run(
      nextSystemId,
      nextUnit,
      row.id
    );
    normalizedCount += 1;
  }

  return { normalizedCount };
}

export function evaluateMonitoringRulesForBuilding(buildingId: string) {
  const events = listTelemetryEventsByBuildingId(buildingId, 500)
    .slice()
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const pointsById = Object.fromEntries(
    listBasPointsByBuildingId(buildingId).map((point) => [point.id, point] as const)
  );
  const nowMs = Date.now();
  const recentWindowMs = 24 * 60 * 60 * 1000;
  const activeIssueTypes = new Set<MonitoringIssue["issueType"]>();

  const recentEvents = events.filter((event) => {
    const eventMs = Date.parse(event.timestamp);
    return Number.isFinite(eventMs) && nowMs - eventMs <= recentWindowMs;
  });

  const faultEvent = recentEvents.find((event) => event.qualityFlag === "fault");
  if (faultEvent) {
    activeIssueTypes.add("sensor_fault");
    upsertOpenRecommendation({
      buildingId,
      systemId: faultEvent.systemId,
      issueType: "sensor_fault",
      summary: "A telemetry point reported a fault quality flag and needs operator review.",
      evidenceWindow: faultEvent.timestamp,
      writebackEligible: false,
      confidenceScore: 0.82
    });
  }

  const highCo2Event = recentEvents.find((event) => {
    const point = event.pointId ? pointsById[event.pointId] : undefined;
    return point?.canonicalPointType === "co2" && typeof event.valueNumeric === "number" && event.valueNumeric >= 1000;
  });
  if (highCo2Event) {
    activeIssueTypes.add("high_co2_low_ventilation");
    upsertOpenRecommendation({
      buildingId,
      systemId: highCo2Event.systemId,
      issueType: "high_co2_low_ventilation",
      summary: `CO2 reading reached ${highCo2Event.valueNumeric} ppm and may indicate insufficient ventilation.`,
      evidenceWindow: highCo2Event.timestamp,
      writebackEligible: false,
      confidenceScore: 0.74
    });
  }

  const afterHoursEvent = recentEvents.find((event) => {
    const point = event.pointId ? pointsById[event.pointId] : undefined;
    const hour = Number(event.timestamp.slice(11, 13));
    return point?.canonicalPointType === "fan_status" && event.valueText?.toLowerCase() === "on" && (hour >= 22 || hour < 6);
  });
  if (afterHoursEvent) {
    activeIssueTypes.add("after_hours_runtime");
    upsertOpenRecommendation({
      buildingId,
      systemId: afterHoursEvent.systemId,
      issueType: "after_hours_runtime",
      summary: "Fan status remained on during an after-hours telemetry window.",
      evidenceWindow: afterHoursEvent.timestamp,
      writebackEligible: true,
      confidenceScore: 0.78
    });
  }

  const scheduleStateEvents = recentEvents.filter((event) => {
    const point = event.pointId ? pointsById[event.pointId] : undefined;
    return point?.canonicalPointType === "schedule" || point?.canonicalPointType === "occupancy_mode";
  });
  const fanOnEvents = recentEvents.filter((event) => {
    const point = event.pointId ? pointsById[event.pointId] : undefined;
    return point?.canonicalPointType === "fan_status" && event.valueText?.toLowerCase() === "on";
  });
  const scheduleMismatch = scheduleStateEvents.find((scheduleEvent) => {
    const state = scheduleEvent.valueText?.toLowerCase();
    if (!state || !["unoccupied", "off", "standby", "auto_unoccupied"].includes(state)) {
      return false;
    }

    const scheduleMs = Date.parse(scheduleEvent.timestamp);
    return fanOnEvents.some((fanEvent) => {
      const fanMs = Date.parse(fanEvent.timestamp);
      return Number.isFinite(scheduleMs) && Number.isFinite(fanMs) && Math.abs(fanMs - scheduleMs) <= 90 * 60 * 1000;
    });
  });
  if (scheduleMismatch) {
    activeIssueTypes.add("schedule_mismatch");
    upsertOpenRecommendation({
      buildingId,
      systemId: scheduleMismatch.systemId,
      issueType: "schedule_mismatch",
      summary: "The BAS schedule indicates unoccupied mode while fan runtime remains active.",
      evidenceWindow: scheduleMismatch.timestamp,
      writebackEligible: true,
      confidenceScore: 0.76
    });
  }

  const overrideEvents = recentEvents.filter((event) => {
    const point = event.pointId ? pointsById[event.pointId] : undefined;
    return point?.canonicalPointType === "manual_override" || point?.canonicalPointType === "occupancy_mode";
  });
  const latestOverride = overrideEvents
    .slice()
    .reverse()
    .find((event) => {
      const state = event.valueText?.toLowerCase();
      return Boolean(state && (state.includes("override") || state === "manual" || state === "occupied"));
    });
  if (latestOverride) {
    const latestOverrideMs = Date.parse(latestOverride.timestamp);
    const overrideCleared = overrideEvents.some((event) => {
      const state = event.valueText?.toLowerCase();
      const eventMs = Date.parse(event.timestamp);
      return (
        Number.isFinite(eventMs) &&
        eventMs > latestOverrideMs &&
        Boolean(state && (state === "auto" || state === "unoccupied" || state === "scheduled"))
      );
    });

    if (!overrideCleared && Number.isFinite(latestOverrideMs) && nowMs - latestOverrideMs >= 2 * 60 * 60 * 1000) {
      activeIssueTypes.add("stale_override");
      upsertOpenRecommendation({
        buildingId,
        systemId: latestOverride.systemId,
        issueType: "stale_override",
        summary: "A manual override has remained active beyond the expected temporary window.",
        evidenceWindow: latestOverride.timestamp,
        writebackEligible: true,
        confidenceScore: 0.72
      });
    }
  }

  reconcileOpenIssues(buildingId, activeIssueTypes);

  return {
    buildingId,
    activeIssueTypes: Array.from(activeIssueTypes),
    issueCount: activeIssueTypes.size
  };
}

export function evaluateMonitoringRulesForAllBuildings() {
  const buildingIds = listBuildingIds();
  return {
    buildingCount: buildingIds.length,
    results: buildingIds.map((buildingId) => evaluateMonitoringRulesForBuilding(buildingId))
  };
}

export function refreshCoverageForAllBuildings(filingYear = new Date().getUTCFullYear()) {
  const buildingIds = listBuildingIds();
  return {
    filingYear,
    buildingCount: buildingIds.length,
    results: buildingIds.map((buildingId) => resolveCoverageRecord(buildingId, filingYear))
  };
}

export function generateRequirementsForAllBuildings(reportingYear: number) {
  const buildingIds = listBuildingIds();
  return {
    reportingYear,
    buildingCount: buildingIds.length,
    results: buildingIds.map((buildingId) => generateComplianceRequirements(buildingId, reportingYear))
  };
}

export function startDiscoveryForAllBuildings() {
  const buildingIds = listBuildingIds();
  return {
    buildingCount: buildingIds.length,
    results: buildingIds.map((buildingId) => startDiscoveryRun(buildingId))
  };
}

function computeBeforeAfterSummary(
  recommendation: Pick<MonitoringIssue, "buildingId" | "issueType" | "systemId">,
  action: Pick<RecommendationAction, "createdAt" | "completedAt">
): BeforeAfterSummary | undefined {
  if (!action.completedAt) {
    return undefined;
  }

  const db = getDatabase();
  const baselineStart = new Date(new Date(action.createdAt).getTime() - 24 * 60 * 60 * 1000).toISOString();
  const baselineEnd = action.createdAt;
  const comparisonStart = action.completedAt;
  const comparisonEnd = new Date(new Date(action.completedAt).getTime() + 24 * 60 * 60 * 1000).toISOString();

  if (recommendation.issueType === "high_co2_low_ventilation") {
    const baseline = db
      .prepare(
        `SELECT AVG(te.value_numeric) AS average_value, COUNT(*) AS sample_count
         FROM telemetry_events te
         INNER JOIN bas_points bp ON bp.id = te.point_id
         WHERE te.building_id = ?
           AND bp.canonical_point_type = 'co2'
           AND te.timestamp >= ?
           AND te.timestamp < ?
           AND te.value_numeric IS NOT NULL`
      )
      .get(recommendation.buildingId, baselineStart, baselineEnd) as {
      average_value: number | null;
      sample_count: number | null;
    };
    const comparison = db
      .prepare(
        `SELECT AVG(te.value_numeric) AS average_value, COUNT(*) AS sample_count
         FROM telemetry_events te
         INNER JOIN bas_points bp ON bp.id = te.point_id
         WHERE te.building_id = ?
           AND bp.canonical_point_type = 'co2'
           AND te.timestamp >= ?
           AND te.timestamp < ?
           AND te.value_numeric IS NOT NULL`
      )
      .get(recommendation.buildingId, comparisonStart, comparisonEnd) as {
      average_value: number | null;
      sample_count: number | null;
    };

    if (Number(comparison.sample_count ?? 0) === 0 && Number(baseline.sample_count ?? 0) === 0) {
      return undefined;
    }

    const baselineValue = baseline.average_value ?? undefined;
    const comparisonValue = comparison.average_value ?? undefined;

    return {
      metricLabel: "Average CO2 ppm",
      baselineValue,
      comparisonValue,
      delta:
        baselineValue !== undefined && comparisonValue !== undefined ? comparisonValue - baselineValue : undefined,
      baselineSampleCount: Number(baseline.sample_count ?? 0),
      comparisonSampleCount: Number(comparison.sample_count ?? 0)
    };
  }

  if (recommendation.issueType === "after_hours_runtime") {
    const baseline = db
      .prepare(
        `SELECT COUNT(*) AS sample_count
         FROM telemetry_events te
         INNER JOIN bas_points bp ON bp.id = te.point_id
         WHERE te.building_id = ?
           AND bp.canonical_point_type = 'fan_status'
           AND te.value_text = 'on'
           AND te.timestamp >= ?
           AND te.timestamp < ?`
      )
      .get(recommendation.buildingId, baselineStart, baselineEnd) as { sample_count: number | null };
    const comparison = db
      .prepare(
        `SELECT COUNT(*) AS sample_count
         FROM telemetry_events te
         INNER JOIN bas_points bp ON bp.id = te.point_id
         WHERE te.building_id = ?
           AND bp.canonical_point_type = 'fan_status'
           AND te.value_text = 'on'
           AND te.timestamp >= ?
           AND te.timestamp < ?`
      )
      .get(recommendation.buildingId, comparisonStart, comparisonEnd) as { sample_count: number | null };
    const baselineValue = Number(baseline.sample_count ?? 0);
    const comparisonValue = Number(comparison.sample_count ?? 0);

    if (baselineValue === 0 && comparisonValue === 0) {
      return undefined;
    }

    return {
      metricLabel: "After-hours fan on events",
      baselineValue,
      comparisonValue,
      delta: comparisonValue - baselineValue,
      baselineSampleCount: baselineValue,
      comparisonSampleCount: comparisonValue
    };
  }

  if (recommendation.issueType === "sensor_fault") {
    const baseline = db
      .prepare(
        `SELECT COUNT(*) AS sample_count
         FROM telemetry_events
         WHERE building_id = ?
           AND quality_flag = 'fault'
           AND timestamp >= ?
           AND timestamp < ?`
      )
      .get(recommendation.buildingId, baselineStart, baselineEnd) as { sample_count: number | null };
    const comparison = db
      .prepare(
        `SELECT COUNT(*) AS sample_count
         FROM telemetry_events
         WHERE building_id = ?
           AND quality_flag = 'fault'
           AND timestamp >= ?
           AND timestamp < ?`
      )
      .get(recommendation.buildingId, comparisonStart, comparisonEnd) as { sample_count: number | null };
    const baselineValue = Number(baseline.sample_count ?? 0);
    const comparisonValue = Number(comparison.sample_count ?? 0);

    if (baselineValue === 0 && comparisonValue === 0) {
      return undefined;
    }

    return {
      metricLabel: "Fault telemetry events",
      baselineValue,
      comparisonValue,
      delta: comparisonValue - baselineValue,
      baselineSampleCount: baselineValue,
      comparisonSampleCount: comparisonValue
    };
  }

  return undefined;
}

export function listRecommendationActionsByBuildingId(buildingId: string): RecommendationAction[] {
  const db = getDatabase();
  const issuesById = Object.fromEntries(
    getMonitoringIssuesByBuildingId(buildingId).map((issue) => [issue.id, issue] as const)
  );

  return db
    .prepare(
      `SELECT id, recommendation_id, building_id, action_type, action_status, assignee, notes, created_at, started_at, completed_at
       FROM recommendation_actions
       WHERE building_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        recommendation_id: string;
        building_id: string;
        action_type: string;
        action_status: RecommendationActionStatus;
        assignee: string | null;
        notes: string | null;
        created_at: string;
        started_at: string | null;
        completed_at: string | null;
      };
      const issue = issuesById[typedRow.recommendation_id];

      return {
        id: typedRow.id,
        recommendationId: typedRow.recommendation_id,
        buildingId: typedRow.building_id,
        actionType: typedRow.action_type,
        actionStatus: typedRow.action_status,
        assignee: typedRow.assignee ?? undefined,
        notes: typedRow.notes ?? undefined,
        createdAt: typedRow.created_at,
        startedAt: typedRow.started_at ?? undefined,
        completedAt: typedRow.completed_at ?? undefined,
        beforeAfter: issue
          ? computeBeforeAfterSummary(issue, {
              createdAt: typedRow.created_at,
              completedAt: typedRow.completed_at ?? undefined
            })
          : undefined
      };
    });
}

export function createRecommendationAction(input: {
  recommendationId: string;
  actionType: string;
  assignee?: string;
  notes?: string;
}) {
  const db = getDatabase();
  const recommendation = db
    .prepare(
      `SELECT id, building_id, issue_type
       FROM recommendations
       WHERE id = ?`
    )
    .get(input.recommendationId) as
    | {
        id: string;
        building_id: string;
        issue_type: MonitoringIssue["issueType"];
      }
    | undefined;

  if (!recommendation) {
    throw new Error(`Recommendation not found: ${input.recommendationId}`);
  }

  const action = {
    id: makeId("act"),
    recommendationId: input.recommendationId,
    buildingId: recommendation.building_id,
    actionType: input.actionType,
    actionStatus: "proposed" as RecommendationActionStatus,
    assignee: input.assignee,
    notes: input.notes,
    createdAt: new Date().toISOString()
  };

  db.prepare(
    `INSERT INTO recommendation_actions (
      id, recommendation_id, building_id, action_type, action_status, assignee, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    action.id,
    action.recommendationId,
    action.buildingId,
    action.actionType,
    action.actionStatus,
    action.assignee ?? null,
    action.notes ?? null,
    action.createdAt
  );

  db.prepare(`UPDATE recommendations SET status = ?, assigned_to = COALESCE(?, assigned_to) WHERE id = ?`).run(
    "in_progress",
    action.assignee ?? null,
    recommendation.id
  );

  recordAuditEvent({
    buildingId: action.buildingId,
    entityType: "recommendation_action",
    entityId: action.id,
    action: "recommendation_action_created",
    actorType: "operator",
    summary: `${action.actionType} action was created for recommendation ${recommendation.issue_type}.`,
    metadataJson: JSON.stringify({
      recommendationId: action.recommendationId,
      assignee: action.assignee ?? null
    })
  });

  return action;
}

export function updateRecommendationActionStatus(input: {
  actionId: string;
  actionStatus: RecommendationActionStatus;
  notes?: string;
}) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id, recommendation_id, building_id, action_type, action_status, notes
       FROM recommendation_actions
       WHERE id = ?`
    )
    .get(input.actionId) as
    | {
        id: string;
        recommendation_id: string;
        building_id: string;
        action_type: string;
        action_status: RecommendationActionStatus;
        notes: string | null;
      }
    | undefined;

  if (!existing) {
    return null;
  }

  const startedAt =
    input.actionStatus === "in_progress"
      ? new Date().toISOString()
      : undefined;
  const completedAt =
    input.actionStatus === "completed"
      ? new Date().toISOString()
      : undefined;

  db.prepare(
    `UPDATE recommendation_actions
     SET action_status = ?,
         notes = COALESCE(?, notes),
         started_at = COALESCE(?, started_at),
         completed_at = COALESCE(?, completed_at)
     WHERE id = ?`
  ).run(input.actionStatus, input.notes ?? null, startedAt ?? null, completedAt ?? null, input.actionId);

  const recommendationStatus =
    input.actionStatus === "completed"
      ? "resolved"
      : input.actionStatus === "cancelled"
        ? "open"
        : "in_progress";

  db.prepare(`UPDATE recommendations SET status = ? WHERE id = ?`).run(
    recommendationStatus,
    existing.recommendation_id
  );

  recordAuditEvent({
    buildingId: existing.building_id,
    entityType: "recommendation_action",
    entityId: existing.id,
    action: "recommendation_action_updated",
    actorType: "operator",
    summary: `${existing.action_type} action moved to ${input.actionStatus}.`,
    metadataJson: JSON.stringify({
      recommendationId: existing.recommendation_id,
      notes: input.notes ?? existing.notes ?? null
    })
  });

  return listRecommendationActionsByBuildingId(existing.building_id).find((action) => action.id === existing.id) ?? null;
}

export function ingestSensorReading(payload: Record<string, unknown>) {
  const db = getDatabase();
  const buildingId = typeof payload.buildingId === "string" ? payload.buildingId : "unknown";
  const pointId = typeof payload.pointId === "string" ? payload.pointId : null;
  const numericValue = typeof payload.value === "number" ? payload.value : null;
  const textValue = typeof payload.value === "string" ? payload.value : null;
  const timestamp = typeof payload.timestamp === "string" ? payload.timestamp : new Date().toISOString();
  const qualityFlag = typeof payload.qualityFlag === "string" ? payload.qualityFlag : "ok";
  const systemId = typeof payload.systemId === "string" ? payload.systemId : null;
  const pointRecord = pointId
    ? (db
        .prepare(
          `SELECT bp.canonical_point_type, ma.id AS monitoring_asset_id
           FROM bas_points bp
           INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
           WHERE bp.id = ?`
        )
        .get(pointId) as
        | {
            canonical_point_type: MonitoringPointType | null;
            monitoring_asset_id: string;
          }
        | undefined)
    : undefined;

  db.prepare(
    `INSERT INTO telemetry_events (
      id, building_id, system_id, point_id, timestamp, value_numeric, value_text, unit, quality_flag
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    makeId("evt"),
    buildingId,
    systemId,
    pointId,
    timestamp,
    numericValue,
    textValue,
    typeof payload.unit === "string" ? payload.unit : null,
    qualityFlag
  );
  normalizeTelemetryEvents();
  evaluateMonitoringRulesForBuilding(buildingId);

  return {
    accepted: true,
    payload
  };
}

export function listDocumentsByBuildingId(buildingId: string): DocumentRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, document_type, file_url, classification_confidence, status, document_category, reporting_year, parsed_status, parser_type, parser_version
       FROM documents
       WHERE building_id = ?
       ORDER BY id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        document_type: string;
        file_url: string;
        classification_confidence: number | null;
        status: string;
        document_category: ReportingDocumentCategory | null;
        reporting_year: number | null;
        parsed_status: ReportingDocumentParsedStatus | null;
        parser_type: string | null;
        parser_version: string | null;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        reportingYear: typedRow.reporting_year ?? undefined,
        documentType: typedRow.document_type,
        documentCategory: typedRow.document_category ?? "owner_attestation",
        fileUrl: typedRow.file_url,
        classificationConfidence: typedRow.classification_confidence ?? undefined,
        status: typedRow.status,
        parsedStatus: typedRow.parsed_status ?? "not_started",
        parserType: typedRow.parser_type ?? undefined,
        parserVersion: typedRow.parser_version ?? undefined
      };
    });
}

export function listEvidenceLinksByBuildingId(buildingId: string): EvidenceLinkRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT
         del.id,
         del.document_id,
         del.requirement_id,
         d.building_id,
         d.document_type,
         cr.requirement_type,
         del.link_status,
         del.notes
       FROM document_evidence_links del
       INNER JOIN documents d ON d.id = del.document_id
       INNER JOIN compliance_requirements cr ON cr.id = del.requirement_id
       WHERE d.building_id = ?
       ORDER BY del.id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        document_id: string;
        requirement_id: string;
        building_id: string;
        document_type: string;
        requirement_type: ComplianceRequirement["type"];
        link_status: EvidenceLinkStatus;
        notes: string | null;
      };

      return {
        id: typedRow.id,
        documentId: typedRow.document_id,
        requirementId: typedRow.requirement_id,
        buildingId: typedRow.building_id,
        documentType: typedRow.document_type,
        requirementType: typedRow.requirement_type,
        linkStatus: typedRow.link_status,
        notes: typedRow.notes ?? undefined
      };
    });
}

export function listAuditEventsByBuildingId(buildingId: string): AuditEvent[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, entity_type, entity_id, action, actor_type, summary, metadata_json, created_at
       FROM audit_events
       WHERE building_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string | null;
        entity_type: string;
        entity_id: string;
        action: string;
        actor_type: AuditActorType;
        summary: string;
        metadata_json: string | null;
        created_at: string;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id ?? undefined,
        entityType: typedRow.entity_type,
        entityId: typedRow.entity_id,
        action: typedRow.action,
        actorType: typedRow.actor_type,
        summary: typedRow.summary,
        metadataJson: typedRow.metadata_json ?? undefined,
        createdAt: typedRow.created_at
      };
    });
}

export function getDocumentWorkspaceByBuildingId(buildingId: string): DocumentWorkspace {
  return {
    documents: listDocumentsByBuildingId(buildingId),
    requirements: fetchRequirements(buildingId),
    evidenceLinks: listEvidenceLinksByBuildingId(buildingId),
    auditEvents: listAuditEventsByBuildingId(buildingId)
  };
}

export function createDocument(input: {
  buildingId: string;
  documentType: string;
  fileUrl?: string;
  documentCategory?: ReportingDocumentCategory;
  reportingYear?: number;
  parsedStatus?: ReportingDocumentParsedStatus;
  parserType?: string;
  parserVersion?: string;
}) {
  const db = getDatabase();
  const document = {
    id: makeId("doc"),
    buildingId: input.buildingId,
    reportingYear: input.reportingYear,
    documentType: input.documentType,
    documentCategory: input.documentCategory ?? "owner_attestation",
    fileUrl: input.fileUrl ?? `file://airwise/${input.buildingId}/${input.documentType.replaceAll(" ", "-")}`,
    classificationConfidence: 0.75,
    status: "uploaded",
    parsedStatus: input.parsedStatus ?? "not_started",
    parserType: input.parserType,
    parserVersion: input.parserVersion
  };

  db.prepare(
    `INSERT INTO documents (
      id, building_id, document_type, file_url, classification_confidence, status, document_category, reporting_year, parsed_status, parser_type, parser_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    document.id,
    document.buildingId,
    document.documentType,
    document.fileUrl,
    document.classificationConfidence,
    document.status,
    document.documentCategory,
    document.reportingYear ?? null,
    document.parsedStatus,
    document.parserType ?? null,
    document.parserVersion ?? null
  );

  recordAuditEvent({
    buildingId: document.buildingId,
    entityType: "document",
    entityId: document.id,
    action: "document_uploaded",
    actorType: "owner",
    summary: `${document.documentType} document was attached to the building workspace.`,
    metadataJson: JSON.stringify({
      fileUrl: document.fileUrl,
      status: document.status,
      documentCategory: document.documentCategory,
      reportingYear: document.reportingYear ?? null
    })
  });

  return document;
}

export function attachDocumentEvidence(input: {
  documentId: string;
  requirementId: string;
  linkStatus: EvidenceLinkStatus;
  notes?: string;
}) {
  const db = getDatabase();
  const requirement = db
    .prepare(
      `SELECT id, building_id, requirement_type, status
       FROM compliance_requirements
       WHERE id = ?`
    )
    .get(input.requirementId) as
    | {
        id: string;
        building_id: string;
        requirement_type: ComplianceRequirement["type"];
        status: ComplianceRequirement["status"];
      }
    | undefined;
  const document = db
    .prepare(`SELECT id, document_type FROM documents WHERE id = ?`)
    .get(input.documentId) as { id: string; document_type: string } | undefined;

  if (!requirement) {
    throw new Error(`Requirement not found: ${input.requirementId}`);
  }

  if (!document) {
    throw new Error(`Document not found: ${input.documentId}`);
  }

  const existing = db
    .prepare(
      `SELECT id
       FROM document_evidence_links
       WHERE document_id = ? AND requirement_id = ?
       LIMIT 1`
    )
    .get(input.documentId, input.requirementId) as { id: string } | undefined;

  const evidenceLink = {
    id: existing?.id ?? makeId("evd"),
    documentId: input.documentId,
    requirementId: input.requirementId,
    linkStatus: input.linkStatus,
    notes: input.notes
  };

  if (existing) {
    db.prepare(`UPDATE document_evidence_links SET link_status = ?, notes = ? WHERE id = ?`).run(
      evidenceLink.linkStatus,
      evidenceLink.notes ?? null,
      evidenceLink.id
    );
  } else {
    db.prepare(
      `INSERT INTO document_evidence_links (id, document_id, requirement_id, link_status, notes)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      evidenceLink.id,
      evidenceLink.documentId,
      evidenceLink.requirementId,
      evidenceLink.linkStatus,
      evidenceLink.notes ?? null
    );
  }

  const nextRequirementStatus: ComplianceRequirement["status"] =
    evidenceLink.linkStatus === "accepted"
      ? requirement.status === "complete"
        ? "complete"
        : "in_progress"
      : evidenceLink.linkStatus === "rejected"
        ? "blocked"
        : requirement.status === "not_started"
          ? "in_progress"
          : requirement.status;
  const nextBlockingReason =
    evidenceLink.linkStatus === "rejected"
      ? "Evidence was rejected and must be replaced or reviewed."
      : nextRequirementStatus === "blocked"
        ? "Awaiting linked evidence."
        : null;

  db.prepare(`UPDATE compliance_requirements SET status = ?, blocking_reason = ? WHERE id = ?`).run(
    nextRequirementStatus,
    nextBlockingReason,
    requirement.id
  );

  recordAuditEvent({
    buildingId: requirement.building_id,
    entityType: "evidence_link",
    entityId: evidenceLink.id,
    action: existing ? "evidence_link_updated" : "evidence_link_created",
    actorType: "owner",
    summary: `${document.document_type} was ${evidenceLink.linkStatus.replaceAll("_", " ")} for ${requirement.requirement_type}.`,
    metadataJson: JSON.stringify({
      documentId: evidenceLink.documentId,
      requirementId: evidenceLink.requirementId,
      linkStatus: evidenceLink.linkStatus,
      notes: evidenceLink.notes ?? null
    })
  });

  return {
    ...evidenceLink,
    buildingId: requirement.building_id,
    documentType: document.document_type,
    requirementType: requirement.requirement_type
  } satisfies EvidenceLinkRecord;
}

export function registerReportingDocument(input: {
  reportingCycleId: string;
  documentType: string;
  documentCategory: ReportingDocumentCategory;
  fileUrl?: string;
}) {
  const cycle = getReportingCycleById(input.reportingCycleId);
  return createDocument({
    buildingId: cycle.buildingId,
    reportingYear: cycle.reportingYear,
    documentType: input.documentType,
    documentCategory: input.documentCategory,
    fileUrl: input.fileUrl
  });
}

function buildDocumentExtractionPayload(document: ReportingDocument, building: Building) {
  const defaultGfa = building.grossFloorArea ?? Math.round((building.grossSquareFeet ?? 0) * 0.95);
  const energyBase = Math.max(1, Math.round(defaultGfa));
  const fileSignal = document.fileUrl.length + document.id.length;
  const electricityKwh = energyBase * 10 + fileSignal;
  const gasTherms = Math.round(energyBase * 0.35 + (fileSignal % 97));

  switch (document.documentCategory) {
    case "espm_export":
      return [
        { fieldKey: "espm_property_id", value: `ESPM-${building.bin ?? building.id}` },
        { fieldKey: "espm_property_name", value: building.name },
        { fieldKey: "gross_floor_area_total", value: defaultGfa },
        { fieldKey: "gfa_by_property_type", value: { multifamily: defaultGfa } },
        { fieldKey: "energy_by_source", value: { electricity_kwh: electricityKwh, natural_gas_therms: gasTherms } },
        { fieldKey: "meter_count", value: 4 }
      ];
    case "utility_bill":
      return [
        {
          fieldKey: "energy_by_source",
          value: {
            electricity_kwh: electricityKwh + 750,
            natural_gas_therms: gasTherms + 120
          }
        },
        { fieldKey: "meter_count", value: 6 }
      ];
    case "prior_ll97_report":
      return [
        { fieldKey: "gross_floor_area_total", value: defaultGfa },
        { fieldKey: "prior_year_compliance_status", value: building.article === "321" ? "noncompliant_then_remediated" : "reported" },
        { fieldKey: "carryforward_from_2025", value: true }
      ];
    case "engineering_report":
      return [
        { fieldKey: "approved_adjustment_type", value: "external_constraints" },
        { fieldKey: "approval_reference", value: `ENG-${building.id.toUpperCase()}` },
        { fieldKey: "supporting_plan_status", value: "submitted_with_engineering_package" }
      ];
    case "owner_attestation":
    default:
      return [
        { fieldKey: "bbl", value: building.bbl ?? "" },
        { fieldKey: "bin", value: building.bin ?? "" },
        { fieldKey: "address", value: `${building.addressLine1}, ${building.city}, ${building.state} ${building.zip}` },
        { fieldKey: "espm_shared_with_city", value: true }
      ].filter((entry) => entry.value !== "");
  }
}

export function extractDocumentIntoReportingInputs(documentId: string) {
  const db = getDatabase();
  const document = db
    .prepare(
      `SELECT id, building_id, document_type, file_url, classification_confidence, status, document_category, reporting_year, parsed_status, parser_type, parser_version
       FROM documents
       WHERE id = ?`
    )
    .get(documentId) as
    | {
        id: string;
        building_id: string;
        document_type: string;
        file_url: string;
        classification_confidence: number | null;
        status: string;
        document_category: ReportingDocumentCategory | null;
        reporting_year: number | null;
        parsed_status: ReportingDocumentParsedStatus | null;
        parser_type: string | null;
        parser_version: string | null;
      }
    | undefined;

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  const reportingYear = document.reporting_year ?? 2026;
  const workspace = getReportingWorkspaceByBuildingId(document.building_id, reportingYear);
  const building = getBuildingById(document.building_id);
  const extractionMethod = `category:${document.document_category ?? "owner_attestation"}`;
  const proposals = buildDocumentExtractionPayload(
    {
      id: document.id,
      buildingId: document.building_id,
      reportingYear,
      documentType: document.document_type,
      documentCategory: document.document_category ?? "owner_attestation",
      fileUrl: document.file_url,
      classificationConfidence: document.classification_confidence ?? undefined,
      status: document.status,
      parsedStatus: document.parsed_status ?? "not_started",
      parserType: document.parser_type ?? undefined,
      parserVersion: document.parser_version ?? undefined
    },
    building
  );

  for (const proposal of proposals) {
    const extractionId = makeId("dex");
    db.prepare(
      `INSERT INTO document_extractions (id, document_id, field_key, value_json, confidence_score, page_ref, extraction_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(extractionId, document.id, proposal.fieldKey, serializeJson(proposal.value), 0.74, "p1", extractionMethod);

    db.prepare(
      `INSERT INTO input_values (
        id, package_id, field_key, value_json, source_type, source_ref, confidence_score, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      makeId("inp"),
      workspace.inputPackage.id,
      proposal.fieldKey,
      serializeJson(proposal.value),
      "document_extraction",
      document.id,
      0.74,
      "pending_review"
    );
  }

  db.prepare(
    `UPDATE documents
     SET parsed_status = ?, parser_type = ?, parser_version = ?
     WHERE id = ?`
  ).run("review_required", "rules_based_prefill", calculationVersion, document.id);

  db.prepare(
    `UPDATE reporting_input_packages
     SET package_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run("review_required", workspace.inputPackage.id);

  recordAuditEvent({
    buildingId: document.building_id,
    entityType: "document_extraction",
    entityId: document.id,
    action: "document_extracted",
    actorType: "system",
    summary: `${document.document_type} generated ${proposals.length} proposed reporting inputs.`,
    metadataJson: JSON.stringify({
      documentId: document.id,
      documentCategory: document.document_category ?? "owner_attestation",
      proposedFieldKeys: proposals.map((proposal) => proposal.fieldKey)
    })
  });

  return getReportingWorkspaceById(workspace.cycle.id);
}

export function calculateReportingCycle(reportingCycleId: string) {
  const db = getDatabase();
  const workspace = getReportingWorkspaceById(reportingCycleId);
  const acceptedInputs = getCycleAcceptedInputMap(workspace.inputPackage.id);
  const activeModuleTypes = workspace.modules
    .filter((module) => module.status === "active" || module.status === "blocked" || module.status === "complete")
    .map((module) => module.moduleType);
  const requiredFieldKeys = getRequiredFieldKeysForActiveModules(
    workspace.cycle.articleSnapshot,
    acceptedInputs,
    activeModuleTypes
  );
  const missingRequiredInputs = requiredFieldKeys.filter((fieldKey) => !acceptedInputs.has(fieldKey));
  const needsReview = getCycleNeedsReviewFieldKeys(workspace.inputPackage.id);
  const warnings: string[] = [];
  const energyBySource = toRecord(acceptedInputs.get("energy_by_source"));
  const gfaByPropertyType = toRecord(acceptedInputs.get("gfa_by_property_type"));
  const grossFloorAreaTotal =
    valueAsNumber(acceptedInputs.get("gross_floor_area_total")) ??
    valueAsNumber(acceptedInputs.get("gross_square_feet")) ??
    0;
  const pathwayMode =
    acceptedInputs.get("article_321_pathway_mode") === "prescriptive" ? "prescriptive" : "performance";
  let actualEmissionsTco2e = computeActualEmissions(energyBySource);
  let adjustedActualEmissionsTco2e = actualEmissionsTco2e;
  let emissionsLimitTco2e =
    Object.keys(gfaByPropertyType).length > 0
      ? computeLimitFromGfa(gfaByPropertyType)
      : grossFloorAreaTotal * propertyTypeLimitFactors.default;
  let adjustedEmissionsLimitTco2e = emissionsLimitTco2e;

  if (activeModuleTypes.includes("deductions")) {
    const touInputs = toRecord(acceptedInputs.get("tou_inputs"));
    const tesInputs = toRecord(acceptedInputs.get("tes_inputs"));
    const bankingInputs = toRecord(acceptedInputs.get("beneficial_electrification_banking"));
    const touReduction = Math.max(0, Math.min(0.15, valueAsNumber(touInputs.reduction_factor) ?? 0.05));
    const tesReduction = Math.max(0, Math.min(0.12, valueAsNumber(tesInputs.reduction_factor) ?? 0.03));
    const bankingCredit = Math.max(0, valueAsNumber(bankingInputs.credit_tco2e) ?? 0);
    adjustedActualEmissionsTco2e = Math.max(
      0,
      adjustedActualEmissionsTco2e * (1 - touReduction) * (1 - tesReduction) - bankingCredit
    );
    warnings.push("Deductions were applied using the structured MVP inputs and should be reviewed before filing.");
  }

  if (activeModuleTypes.includes("adjustment_320_7")) {
    const offsetsPurchased = isTruthy(acceptedInputs.get("offsets_purchased"));
    const constraintType = acceptedInputs.get("constraint_type");
    if (!offsetsPurchased) {
      missingRequiredInputs.push("offsets_purchased");
      warnings.push("320.7 adjustment is active but offsets have not been confirmed.");
    } else {
      adjustedEmissionsLimitTco2e *= constraintType === "external_constraints" ? 1.1 : 1.05;
    }
  }

  if (activeModuleTypes.includes("adjustment_320_8_320_9")) {
    const carryforward = isTruthy(acceptedInputs.get("carryforward_from_2025"));
    if (carryforward) {
      adjustedEmissionsLimitTco2e *= 1.08;
    } else {
      adjustedEmissionsLimitTco2e *= 1.05;
      warnings.push("320.8 / 320.9 adjustment is modeled without prior-year carryforward confirmation.");
    }
  }

  if (workspace.cycle.articleSnapshot === "321" && pathwayMode === "prescriptive") {
    const incompletePecms = workspace.pecmStatuses.filter(
      (pecm) =>
        pecm.applicability !== "not_applicable" &&
        pecm.complianceStatus !== "in_compliance"
    );

    if (incompletePecms.length > 0) {
      warnings.push("Article 321 prescriptive pathway remains blocked until all applicable PECMs are in compliance.");
    }
  }

  if (workspace.attestations.some((attestation) => attestation.completionStatus === "blocked")) {
    warnings.push("One or more attestations are blocked by owner-of-record mismatch.");
  }

  const overLimitTco2e = Math.max(0, adjustedActualEmissionsTco2e - adjustedEmissionsLimitTco2e);
  const mitigationPending =
    activeModuleTypes.includes("penalty_mitigation") && isTruthy(acceptedInputs.get("mitigation_requested"));
  const filingDueDate = workspace.cycle.extensionRequested ? workspace.cycle.extendedDueDate ?? workspace.cycle.filingDueDate : workspace.cycle.filingDueDate;
  const calculationOutputs = {
    filing_due_date: filingDueDate,
    actual_emissions_tco2e: Number(actualEmissionsTco2e.toFixed(2)),
    adjusted_actual_emissions_tco2e: Number(adjustedActualEmissionsTco2e.toFixed(2)),
    emissions_limit_tco2e: Number(emissionsLimitTco2e.toFixed(2)),
    adjusted_emissions_limit_tco2e: Number(adjustedEmissionsLimitTco2e.toFixed(2)),
    over_limit_tco2e: Number(overLimitTco2e.toFixed(2)),
    late_penalty_usd: Math.round(calculateLateReportPenalty(grossFloorAreaTotal, 1)),
    emissions_penalty_usd: Math.round(calculateEmissionsPenalty(adjustedActualEmissionsTco2e, adjustedEmissionsLimitTco2e)),
    mitigation_pending: mitigationPending,
    article_321_pathway_mode: pathwayMode
  };

  db.prepare(
    `INSERT INTO calculation_runs (
      id, reporting_cycle_id, calculation_version, missing_required_inputs_json, needs_review_json, warnings_json, calculation_outputs_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    makeId("calc"),
    reportingCycleId,
    calculationVersion,
    serializeJson(Array.from(new Set(missingRequiredInputs))),
    serializeJson(Array.from(new Set(needsReview))),
    serializeJson(warnings),
    serializeJson(calculationOutputs)
  );

  const packageStatus: ReportingPackageStatus =
    missingRequiredInputs.length > 0 || needsReview.length > 0 ? "review_required" : "approved_for_calc";
  db.prepare(
    `UPDATE reporting_input_packages
     SET package_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(packageStatus, workspace.inputPackage.id);

  for (const module of workspace.modules) {
    let status = module.status;
    let blockingReason: string | null = null;

    if (module.status !== "inactive") {
      if (module.moduleType === "article_321_report" && pathwayMode === "prescriptive") {
        const incompletePecmCount = workspace.pecmStatuses.filter(
          (pecm) =>
            pecm.applicability !== "not_applicable" && pecm.complianceStatus !== "in_compliance"
        ).length;
        if (incompletePecmCount > 0) {
          status = "blocked";
          blockingReason = "Applicable PECMs remain incomplete.";
        } else if (missingRequiredInputs.length === 0 && needsReview.length === 0) {
          status = "complete";
        }
      } else if (module.moduleType === "adjustment_320_7" && !isTruthy(acceptedInputs.get("offsets_purchased"))) {
        status = "blocked";
        blockingReason = "Offsets purchase confirmation is required for the 320.7 module.";
      } else if (missingRequiredInputs.length === 0 && needsReview.length === 0) {
        status = "complete";
      } else {
        status = "blocked";
        blockingReason = "Required inputs or reviews are still outstanding.";
      }
    }

    db.prepare(
      `UPDATE filing_modules
       SET status = ?, blocking_reason = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(status, blockingReason, module.id);
  }

  updateReportingCycleStatus(
    reportingCycleId,
    missingRequiredInputs.length > 0 || needsReview.length > 0 || warnings.some((warning) => warning.includes("blocked"))
      ? "blocked"
      : "ready",
    filingDueDate
  );

  recordAuditEvent({
    buildingId: workspace.cycle.buildingId,
    entityType: "calculation_run",
    entityId: reportingCycleId,
    action: "reporting_cycle_calculated",
    actorType: "system",
    summary: `Reporting cycle ${workspace.cycle.reportingYear} calculations were refreshed.`,
    metadataJson: JSON.stringify({
      missingRequiredInputs,
      needsReview,
      warnings,
      calculationOutputs
    })
  });

  return getReportingWorkspaceById(reportingCycleId);
}

export function getLatestReportingCalculationRun(reportingCycleId: string) {
  return getLatestCalculationRunByCycleId(reportingCycleId);
}

export function listBasPointsByBuildingId(buildingId: string): BasPointRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT bp.id, bp.monitoring_asset_id, bp.object_identifier, bp.object_name, bp.canonical_point_type, bp.unit,
              bp.is_writable, bp.is_whitelisted, bp.safety_category
       FROM bas_points bp
       INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
       WHERE ma.building_id = ?
       ORDER BY bp.object_name ASC`
    )
    .all(buildingId)
    .map((row) => {
      const typedRow = row as {
        id: string;
        monitoring_asset_id: string;
        object_identifier: string;
        object_name: string;
        canonical_point_type: string | null;
        unit: string | null;
        is_writable: number;
        is_whitelisted: number;
        safety_category: string | null;
      };

      return {
        id: typedRow.id,
        monitoringAssetId: typedRow.monitoring_asset_id,
        objectIdentifier: typedRow.object_identifier,
        objectName: typedRow.object_name,
        canonicalPointType: typedRow.canonical_point_type ?? undefined,
        unit: typedRow.unit ?? undefined,
        isWritable: Boolean(typedRow.is_writable),
        isWhitelisted: Boolean(typedRow.is_whitelisted),
        safetyCategory: typedRow.safety_category ?? undefined
      };
    });
}

export function updateBasPointMapping(input: {
  pointId: string;
  canonicalPointType?: string;
  isWhitelisted?: boolean;
  safetyCategory?: string;
}) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT bp.id, ma.building_id, bp.is_writable
       FROM bas_points bp
       INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
       WHERE bp.id = ?`
    )
    .get(input.pointId) as
    | {
        id: string;
        building_id: string;
        is_writable: number;
      }
    | undefined;

  if (!existing) {
    throw new Error(`BAS point not found: ${input.pointId}`);
  }

  const canonicalPointType = canonicalPointTypes.includes(input.canonicalPointType as MonitoringPointType)
    ? (input.canonicalPointType as MonitoringPointType)
    : undefined;
  const writable = Boolean(existing.is_writable);
  const whitelisted =
    writable && canonicalPointType && writablePointTypes.includes(canonicalPointType)
      ? Boolean(input.isWhitelisted)
      : false;

  db.prepare(
    `UPDATE bas_points
     SET canonical_point_type = ?, is_whitelisted = ?, safety_category = COALESCE(?, safety_category)
     WHERE id = ?`
  ).run(canonicalPointType ?? null, whitelisted ? 1 : 0, input.safetyCategory ?? null, input.pointId);

  recordAuditEvent({
    buildingId: existing.building_id,
    entityType: "bas_point",
    entityId: input.pointId,
    action: "bas_point_mapped",
    actorType: "operator",
    summary: `BAS point ${input.pointId} mapping was updated.`,
    metadataJson: JSON.stringify({
      canonicalPointType: canonicalPointType ?? null,
      isWhitelisted: whitelisted,
      safetyCategory: input.safetyCategory ?? null
    })
  });

  return listBasPointsByBuildingId(existing.building_id).find((point) => point.id === input.pointId) ?? null;
}

function insertTelemetryEvent(input: {
  buildingId: string;
  systemId?: string;
  pointId?: string;
  timestamp: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  unit?: string | null;
  qualityFlag?: string | null;
}) {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO telemetry_events (
      id, building_id, system_id, point_id, timestamp, value_numeric, value_text, unit, quality_flag
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    makeId("evt"),
    input.buildingId,
    input.systemId ?? null,
    input.pointId ?? null,
    input.timestamp,
    input.valueNumeric ?? null,
    input.valueText ?? null,
    input.unit ?? null,
    input.qualityFlag ?? "ok"
  );
}

export function ingestBacnetGatewayDiscoverySnapshot(input: {
  buildingId: string;
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
  assets: Array<{
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
}) {
  const db = getDatabase();
  const observedAt = input.observedAt ?? new Date().toISOString();
  const gateway =
    (input.gatewayId ? listBacnetGatewaysByBuildingId(input.buildingId).find((item) => item.id === input.gatewayId) : null) ??
    registerBacnetGateway({
      buildingId: input.buildingId,
      name: input.gateway?.name ?? "BACnet Gateway",
      protocol: input.gateway?.protocol ?? "BACnet/IP",
      vendor: input.gateway?.vendor,
      host: input.gateway?.host,
      port: input.gateway?.port,
      authType: input.gateway?.authType,
      metadataJson: input.gateway?.metadataJson
    });

  if (!gateway) {
    throw new Error("Could not resolve a BACnet gateway for discovery.");
  }

  const discoveryRunId = makeId("gwdiscover");
  db.prepare(
    `INSERT INTO bacnet_gateway_discovery_runs (
      id, gateway_id, building_id, source, asset_count, point_count, telemetry_event_count, status, summary_json, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(discoveryRunId, gateway.id, input.buildingId, "gateway_snapshot", 0, 0, 0, "running", null, null);

  let assetCount = 0;
  let pointCount = 0;
  let telemetryEventCount = 0;
  let firstAssetId = "";
  let firstPointId = "";

  try {
    for (const asset of input.assets) {
      const sourceAssetKey =
        normalizeSourceKey(asset.assetKey) ??
        normalizeSourceKey([asset.systemName, asset.location].filter(Boolean).join("|")) ??
        makeId("assetkey");
      const existingAsset = db
        .prepare(
          `SELECT id
           FROM monitoring_assets
           WHERE building_id = ?
             AND source_gateway_id = ?
             AND source_asset_key = ?
           LIMIT 1`
        )
        .get(input.buildingId, gateway.id, sourceAssetKey) as { id: string } | undefined;
      const assetId = existingAsset?.id ?? makeId("asset");

      if (existingAsset) {
        db.prepare(
          `UPDATE monitoring_assets
           SET system_name = ?, asset_type = ?, protocol = ?, vendor = ?, location = ?, status = ?, source_gateway_id = ?, source_asset_key = ?
           WHERE id = ?`
        ).run(
          asset.systemName,
          asset.assetType ?? "fan_system",
          asset.protocol ?? gateway.protocol,
          asset.vendor ?? gateway.vendor ?? null,
          asset.location ?? null,
          asset.status ?? "active",
          gateway.id,
          sourceAssetKey,
          assetId
        );
      } else {
        db.prepare(
          `INSERT INTO monitoring_assets (
            id, building_id, system_name, asset_type, protocol, vendor, location, status, source_gateway_id, source_asset_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          assetId,
          input.buildingId,
          asset.systemName,
          asset.assetType ?? "fan_system",
          asset.protocol ?? gateway.protocol,
          asset.vendor ?? gateway.vendor ?? null,
          asset.location ?? null,
          asset.status ?? "active",
          gateway.id,
          sourceAssetKey
        );
      }

      if (!firstAssetId) {
        firstAssetId = assetId;
      }
      assetCount += 1;

      for (const point of asset.points) {
        const pointType =
          canonicalPointTypes.includes(point.canonicalPointType as MonitoringPointType)
            ? (point.canonicalPointType as MonitoringPointType)
            : inferCanonicalPointType({
                objectName: point.objectName,
                objectIdentifier: point.objectIdentifier,
                unit: point.unit
              });
        const safetyCategory = inferSafetyCategory({
          objectName: point.objectName,
          canonicalPointType: pointType,
          safetyCategory: point.safetyCategory
        });
        const pointKey =
          normalizeSourceKey(point.pointKey) ??
          normalizeSourceKey(point.objectIdentifier) ??
          normalizeSourceKey(point.objectName) ??
          makeId("pointkey");
        const isWritable = Boolean(point.isWritable);
        const isWhitelisted =
          typeof point.isWhitelisted === "boolean"
            ? point.isWhitelisted
            : Boolean(isWritable && pointType && writablePointTypes.includes(pointType) && safetyCategory !== "life_safety");
        const existingPoint = db
          .prepare(
            `SELECT id
             FROM bas_points
             WHERE monitoring_asset_id = ?
               AND (source_point_key = ? OR object_identifier = ?)
             LIMIT 1`
          )
          .get(assetId, pointKey, point.objectIdentifier) as { id: string } | undefined;
        const pointId = existingPoint?.id ?? makeId("point");
        const metadataJson = JSON.stringify({
          gatewayId: gateway.id,
          sourcePointKey: pointKey,
          gatewayPointMetadata: point.metadata ?? {},
          currentValue:
            typeof point.presentValue === "string" || typeof point.presentValue === "number"
              ? String(point.presentValue)
              : undefined,
          lastGatewaySeenAt: observedAt
        });

        if (existingPoint) {
          db.prepare(
            `UPDATE bas_points
             SET object_identifier = ?, object_name = ?, canonical_point_type = ?, unit = ?, is_writable = ?, is_whitelisted = ?, safety_category = ?, metadata_json = ?, source_point_key = ?
             WHERE id = ?`
          ).run(
            point.objectIdentifier,
            point.objectName,
            pointType ?? null,
            point.unit ?? null,
            isWritable ? 1 : 0,
            isWhitelisted ? 1 : 0,
            safetyCategory,
            metadataJson,
            pointKey,
            pointId
          );
        } else {
          db.prepare(
            `INSERT INTO bas_points (
              id, monitoring_asset_id, object_identifier, object_name, canonical_point_type, unit, is_writable, is_whitelisted, safety_category, metadata_json, source_point_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(
            pointId,
            assetId,
            point.objectIdentifier,
            point.objectName,
            pointType ?? null,
            point.unit ?? null,
            isWritable ? 1 : 0,
            isWhitelisted ? 1 : 0,
            safetyCategory,
            metadataJson,
            pointKey
          );
        }

        if (!firstPointId) {
          firstPointId = pointId;
        }
        pointCount += 1;

        if (typeof point.presentValue === "number" || typeof point.presentValue === "string") {
          insertTelemetryEvent({
            buildingId: input.buildingId,
            systemId: assetId,
            pointId,
            timestamp: observedAt,
            valueNumeric: typeof point.presentValue === "number" ? point.presentValue : null,
            valueText: typeof point.presentValue === "string" ? point.presentValue : null,
            unit: point.unit ?? null,
            qualityFlag: point.qualityFlag ?? "ok"
          });
          telemetryEventCount += 1;
        }
      }
    }

    db.prepare(
      `UPDATE bacnet_gateways
       SET status = ?, last_seen_at = ?, last_discovery_at = ?
       WHERE id = ?`
    ).run("online", observedAt, observedAt, gateway.id);

    const summaryJson = JSON.stringify({
      gatewayId: gateway.id,
      gatewayName: gateway.name,
      assetId: firstAssetId,
      pointId: firstPointId,
      assetCount,
      pointCount,
      telemetryEventCount
    });

    db.prepare(
      `UPDATE bacnet_gateway_discovery_runs
       SET asset_count = ?, point_count = ?, telemetry_event_count = ?, status = ?, summary_json = ?, completed_at = ?
       WHERE id = ?`
    ).run(assetCount, pointCount, telemetryEventCount, "completed", summaryJson, new Date().toISOString(), discoveryRunId);

    recordAuditEvent({
      buildingId: input.buildingId,
      entityType: "bacnet_gateway_discovery",
      entityId: discoveryRunId,
      action: "gateway_snapshot_imported",
      actorType: "operator",
      summary: `${gateway.name} imported ${assetCount} asset(s) and ${pointCount} point(s) from a gateway snapshot.`,
      metadataJson: summaryJson
    });

    normalizeTelemetryEvents();
    evaluateMonitoringRulesForBuilding(input.buildingId);

    return {
      id: discoveryRunId,
      buildingId: input.buildingId,
      assetId: firstAssetId,
      pointId: firstPointId,
      gatewayId: gateway.id,
      assetCount,
      pointCount,
      telemetryEventCount,
      status: "completed"
    } satisfies DiscoveryRunRecord;
  } catch (error) {
    db.prepare(
      `UPDATE bacnet_gateway_discovery_runs
       SET asset_count = ?, point_count = ?, telemetry_event_count = ?, status = ?, summary_json = ?, completed_at = ?
       WHERE id = ?`
    ).run(
      assetCount,
      pointCount,
      telemetryEventCount,
      "failed",
      JSON.stringify({
        gatewayId: gateway.id,
        assetCount,
        pointCount,
        telemetryEventCount,
        error: error instanceof Error ? error.message : String(error)
      }),
      new Date().toISOString(),
      discoveryRunId
    );
    throw error;
  }
}

export function ingestBacnetGatewayTelemetry(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  events: Array<{
    assetKey?: string;
    pointKey?: string;
    objectIdentifier?: string;
    value: string | number;
    unit?: string;
    qualityFlag?: string;
  }>;
}) {
  const gateway = requireGatewayToken(input.gatewayId, input.token);
  const observedAt = input.observedAt ?? new Date().toISOString();
  let acceptedCount = 0;
  let ignoredCount = 0;
  const touchedBuildings = new Set<string>();

  for (const event of input.events) {
    const resolved = resolveGatewayPoint({
      gatewayId: input.gatewayId,
      assetKey: normalizeSourceKey(event.assetKey),
      pointKey: normalizeSourceKey(event.pointKey),
      objectIdentifier: event.objectIdentifier
    });

    if (!resolved) {
      ignoredCount += 1;
      continue;
    }

    insertTelemetryEvent({
      buildingId: resolved.buildingId,
      systemId: resolved.assetId,
      pointId: resolved.pointId,
      timestamp: observedAt,
      valueNumeric: typeof event.value === "number" ? event.value : null,
      valueText: typeof event.value === "string" ? event.value : null,
      unit: event.unit ?? null,
      qualityFlag: event.qualityFlag ?? "ok"
    });
    acceptedCount += 1;
    touchedBuildings.add(resolved.buildingId);
  }

  const db = getDatabase();
  db.prepare(`UPDATE bacnet_gateways SET status = ?, last_seen_at = ? WHERE id = ?`).run(
    "online",
    observedAt,
    gateway.id
  );

  normalizeTelemetryEvents();
  for (const buildingId of touchedBuildings) {
    evaluateMonitoringRulesForBuilding(buildingId);
  }

  return {
    gatewayId: gateway.id,
    observedAt,
    acceptedCount,
    ignoredCount
  };
}

function getGatewayExecutionContextForPoint(pointId: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT bp.id AS point_id, bp.object_identifier, bp.object_name, bp.source_point_key,
              ma.id AS asset_id, ma.building_id, ma.source_gateway_id, ma.source_asset_key,
              gw.name AS gateway_name, gw.runtime_mode
       FROM bas_points bp
       INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
       LEFT JOIN bacnet_gateways gw ON gw.id = ma.source_gateway_id
       WHERE bp.id = ?`
    )
    .get(pointId) as
    | {
        point_id: string;
        object_identifier: string;
        object_name: string;
        source_point_key: string | null;
        asset_id: string;
        building_id: string;
        source_gateway_id: string | null;
        source_asset_key: string | null;
        gateway_name: string | null;
        runtime_mode: string | null;
      }
    | undefined;

  return row;
}

function queueGatewayCommandDispatch(commandId: string) {
  const db = getDatabase();
  const command = getControlCommandById(commandId);

  if (!command) {
    return null;
  }

  const pointContext = getGatewayExecutionContextForPoint(command.pointId);
  if (!pointContext?.source_gateway_id) {
    return null;
  }

  const existing = db
    .prepare(
      `SELECT id
       FROM gateway_command_dispatches
       WHERE command_id = ?
       LIMIT 1`
    )
    .get(commandId) as { id: string } | undefined;
  const dispatchId = existing?.id ?? makeId("dispatch");
  const payloadJson = JSON.stringify({
    commandId,
    buildingId: command.buildingId,
    pointId: command.pointId,
    pointKey: pointContext.source_point_key ?? null,
    assetKey: pointContext.source_asset_key ?? null,
    objectIdentifier: pointContext.object_identifier,
    objectName: pointContext.object_name,
    commandType: command.commandType,
    requestedValue: command.requestedValue,
    expiresAt: command.expiresAt ?? null
  });

  if (existing) {
    db.prepare(
      `UPDATE gateway_command_dispatches
       SET status = ?, payload_json = ?, error_message = NULL
       WHERE id = ?`
    ).run("pending", payloadJson, dispatchId);
  } else {
    db.prepare(
      `INSERT INTO gateway_command_dispatches (
        id, gateway_id, command_id, building_id, point_id, status, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      dispatchId,
      pointContext.source_gateway_id,
      commandId,
      command.buildingId,
      command.pointId,
      "pending",
      payloadJson
    );
  }

  db.prepare(`UPDATE control_commands SET status = ?, execution_notes = ? WHERE id = ?`).run(
    "dispatch_pending",
    `Queued for gateway runtime ${pointContext.gateway_name ?? pointContext.source_gateway_id}.`,
    commandId
  );

  recordAuditEvent({
    buildingId: command.buildingId,
    entityType: "gateway_command_dispatch",
    entityId: dispatchId,
    action: "gateway_dispatch_queued",
    actorType: "system",
    summary: `${command.commandType} command was queued for gateway dispatch.`,
    metadataJson: payloadJson
  });

  return {
    dispatchId,
    gatewayId: pointContext.source_gateway_id,
    runtimeMode: pointContext.runtime_mode ?? "outbox"
  };
}

function deliverPendingGatewayCommandDispatches(gatewayId: string, deliveryTime = new Date().toISOString()) {
  const db = getDatabase();
  const pending = db
    .prepare(
      `SELECT id, gateway_id, command_id, building_id, point_id, status, payload_json, response_json, error_message, created_at, dispatched_at, acknowledged_at,
              delivery_attempt_count, last_delivery_attempt_at
       FROM gateway_command_dispatches
       WHERE gateway_id = ? AND status = 'pending'
       ORDER BY created_at ASC`
    )
    .all(gatewayId) as Array<{
      id: string;
      gateway_id: string;
      command_id: string;
      building_id: string;
      point_id: string;
      status: string;
      payload_json: string;
      response_json: string | null;
      error_message: string | null;
      created_at: string;
      dispatched_at: string | null;
      acknowledged_at: string | null;
      delivery_attempt_count: number;
      last_delivery_attempt_at: string | null;
    }>;

  if (pending.length > 0) {
    db.prepare(
      `UPDATE gateway_command_dispatches
       SET status = 'delivered',
           dispatched_at = COALESCE(dispatched_at, ?),
           delivery_attempt_count = delivery_attempt_count + 1,
           last_delivery_attempt_at = ?
       WHERE gateway_id = ? AND status = 'pending'`
    ).run(deliveryTime, deliveryTime, gatewayId);
  }

  return pending.map((row) => ({
    id: row.id,
    gatewayId: row.gateway_id,
    commandId: row.command_id,
    buildingId: row.building_id,
    pointId: row.point_id,
    status: "delivered",
    payloadJson: row.payload_json,
    responseJson: row.response_json ?? undefined,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    dispatchedAt: row.dispatched_at ?? deliveryTime,
    acknowledgedAt: row.acknowledged_at ?? undefined,
    deliveryAttemptCount: row.delivery_attempt_count + 1,
    lastDeliveryAttemptAt: deliveryTime
  } satisfies GatewayCommandDispatchRecord));
}

export function heartbeatGatewayRuntime(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  agentVersion?: string;
  status?: string;
  queueDepth?: number;
  telemetryLagSeconds?: number;
  metadata?: Record<string, unknown>;
}) {
  const gateway = requireGatewayToken(input.gatewayId, input.token);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const heartbeatStatus = input.status?.trim() || "healthy";
  const db = getDatabase();
  const runtimeMetadata = updateGatewayRuntimeMetadata(input.gatewayId, {
    queueDepth: input.queueDepth ?? null,
    telemetryLagSeconds: input.telemetryLagSeconds ?? null,
    ...(input.metadata ?? {})
  });

  db.prepare(
    `UPDATE bacnet_gateways
     SET status = ?, last_seen_at = ?, last_heartbeat_at = ?, heartbeat_status = ?, agent_version = COALESCE(?, agent_version), runtime_metadata_json = COALESCE(?, runtime_metadata_json)
     WHERE id = ?`
  ).run(
    heartbeatStatus === "stale" ? "stale" : "online",
    observedAt,
    observedAt,
    heartbeatStatus,
    input.agentVersion ?? null,
    runtimeMetadata ? JSON.stringify(runtimeMetadata) : null,
    input.gatewayId
  );

  const refreshed = getBacnetGatewayById(gateway.id) ?? gateway;

  return {
    observedAt,
    ...buildGatewayRuntimeState(refreshed, observedAt)
  };
}

export function startGatewayPollCycle(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  reason?: string;
  includeCommands?: boolean;
}) {
  const gateway = requireGatewayToken(input.gatewayId, input.token);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const pollIntervalSeconds = normalizePollIntervalSeconds(gateway.pollIntervalSeconds);
  const db = getDatabase();
  const nextPollDueAt = addSecondsToIso(observedAt, pollIntervalSeconds);

  db.prepare(
    `UPDATE bacnet_gateways
     SET status = ?, last_seen_at = ?, last_heartbeat_at = COALESCE(last_heartbeat_at, ?), heartbeat_status = CASE WHEN heartbeat_status = 'unknown' THEN 'healthy' ELSE heartbeat_status END,
         last_poll_requested_at = ?, next_poll_due_at = ?
     WHERE id = ?`
  ).run("online", observedAt, observedAt, observedAt, nextPollDueAt, input.gatewayId);

  if (input.reason) {
    updateGatewayRuntimeMetadata(input.gatewayId, { lastPollReason: input.reason });
  }

  const commands = input.includeCommands === false ? [] : deliverPendingGatewayCommandDispatches(input.gatewayId, observedAt);
  const refreshed = getBacnetGatewayById(input.gatewayId) ?? gateway;

  return {
    observedAt,
    commands,
    shouldPollTelemetry: true,
    shouldPollDiscovery: !refreshed.lastDiscoveryAt,
    ...buildGatewayRuntimeState(refreshed, observedAt)
  };
}

export function completeGatewayPollCycle(input: {
  gatewayId: string;
  token: string;
  observedAt?: string;
  telemetryAcceptedCount?: number;
  telemetryIgnoredCount?: number;
  discoveryAssetCount?: number;
  notes?: string;
}) {
  const gateway = requireGatewayToken(input.gatewayId, input.token);
  const observedAt = input.observedAt ?? new Date().toISOString();
  const pollIntervalSeconds = normalizePollIntervalSeconds(gateway.pollIntervalSeconds);
  const nextPollDueAt = addSecondsToIso(observedAt, pollIntervalSeconds);
  const runtimeMetadata = updateGatewayRuntimeMetadata(input.gatewayId, {
    lastPollNotes: input.notes ?? null,
    lastPollTelemetryAcceptedCount: input.telemetryAcceptedCount ?? 0,
    lastPollTelemetryIgnoredCount: input.telemetryIgnoredCount ?? 0,
    lastPollDiscoveryAssetCount: input.discoveryAssetCount ?? 0
  });

  getDatabase()
    .prepare(
      `UPDATE bacnet_gateways
       SET status = ?, last_seen_at = ?, last_poll_completed_at = ?, next_poll_due_at = ?, runtime_metadata_json = COALESCE(?, runtime_metadata_json)
       WHERE id = ?`
    )
    .run("online", observedAt, observedAt, nextPollDueAt, runtimeMetadata ? JSON.stringify(runtimeMetadata) : null, input.gatewayId);

  const refreshed = getBacnetGatewayById(input.gatewayId) ?? gateway;

  return {
    observedAt,
    ...buildGatewayRuntimeState(refreshed, observedAt)
  };
}

export function listPendingGatewayCommandDispatches(input: { gatewayId: string; token: string }) {
  requireGatewayToken(input.gatewayId, input.token);
  return deliverPendingGatewayCommandDispatches(input.gatewayId);
}

export function acknowledgeGatewayCommandDispatch(input: {
  gatewayId: string;
  token: string;
  dispatchId: string;
  success: boolean;
  responseJson?: string;
  errorMessage?: string;
  appliedValue?: string;
}) {
  const gateway = requireGatewayToken(input.gatewayId, input.token);
  const db = getDatabase();
  const dispatch = db
    .prepare(
      `SELECT id, gateway_id, command_id, building_id, point_id, status
       FROM gateway_command_dispatches
       WHERE id = ? AND gateway_id = ?
       LIMIT 1`
    )
    .get(input.dispatchId, input.gatewayId) as
    | {
        id: string;
        gateway_id: string;
        command_id: string;
        building_id: string;
        point_id: string;
        status: string;
      }
    | undefined;

  if (!dispatch) {
    throw new Error(`Dispatch ${input.dispatchId} not found for gateway ${input.gatewayId}.`);
  }

  const acknowledgedAt = new Date().toISOString();
  db.prepare(
    `UPDATE gateway_command_dispatches
     SET status = ?, response_json = ?, error_message = ?, acknowledged_at = ?, dispatched_at = COALESCE(dispatched_at, ?)
     WHERE id = ?`
  ).run(
    input.success ? "acknowledged" : "failed",
    input.responseJson ?? null,
    input.success ? null : input.errorMessage ?? "Gateway runtime reported a failure.",
    acknowledgedAt,
    acknowledgedAt,
    input.dispatchId
  );

  if (input.success) {
    applyPointValue(dispatch.point_id, input.appliedValue ?? getControlCommandById(dispatch.command_id)?.requestedValue ?? "auto", `gateway-dispatch:${dispatch.id}`);
    db.prepare(
      `UPDATE control_commands
       SET status = ?, executed_at = COALESCE(executed_at, ?), execution_notes = ?
       WHERE id = ?`
    ).run(
      "executed",
      acknowledgedAt,
      `Gateway runtime ${gateway.name} acknowledged command dispatch.`,
      dispatch.command_id
    );
  } else {
    db.prepare(
      `UPDATE control_commands
       SET status = ?, execution_notes = ?
       WHERE id = ?`
    ).run("dispatch_failed", input.errorMessage ?? "Gateway runtime reported a failure.", dispatch.command_id);
  }

  recordAuditEvent({
    buildingId: dispatch.building_id,
    entityType: "gateway_command_dispatch",
    entityId: dispatch.id,
    action: input.success ? "gateway_dispatch_acknowledged" : "gateway_dispatch_failed",
    actorType: "system",
    summary: input.success
      ? `Gateway runtime acknowledged dispatch ${dispatch.id}.`
      : `Gateway runtime failed dispatch ${dispatch.id}.`,
    metadataJson: JSON.stringify({
      commandId: dispatch.command_id,
      responseJson: input.responseJson ?? null,
      errorMessage: input.errorMessage ?? null
    })
  });

  return listGatewayCommandDispatchesByBuildingId(dispatch.building_id).find((item) => item.id === dispatch.id) ?? null;
}

export function processPendingGatewayCommandDispatches(gatewayId?: string) {
  const db = getDatabase();
  const reconciliation = reconcileGatewayCommandDispatches();
  const gateways = gatewayId
    ? [getBacnetGatewayById(gatewayId)].filter((gateway): gateway is BacnetGatewayRecord => Boolean(gateway))
    : (db
        .prepare(`SELECT id FROM bacnet_gateways WHERE status IN ('configured', 'online') ORDER BY id ASC`)
        .all() as Array<{ id: string }>)
        .map((row) => getBacnetGatewayById(row.id))
        .filter((gateway): gateway is BacnetGatewayRecord => Boolean(gateway));
  let processedCount = 0;

  for (const gateway of gateways) {
    if (gateway.runtimeMode !== "loopback") {
      continue;
    }

    const pending = db
      .prepare(
        `SELECT id
         FROM gateway_command_dispatches
         WHERE gateway_id = ? AND status = 'pending'
         ORDER BY created_at ASC`
      )
      .all(gateway.id) as Array<{ id: string }>;

    for (const dispatch of pending) {
      acknowledgeGatewayCommandDispatch({
        gatewayId: gateway.id,
        token: gateway.ingestToken ?? "",
        dispatchId: dispatch.id,
        success: true,
        responseJson: JSON.stringify({ mode: "loopback" })
      });
      processedCount += 1;
    }
  }

  return {
    processedCount,
    requeuedCount: reconciliation.requeuedCount,
    deadLetterCount: reconciliation.deadLetterCount
  };
}

export function reconcileGatewayCommandDispatches(referenceTime = new Date().toISOString()) {
  const db = getDatabase();
  const gateways = (db
    .prepare(`SELECT id FROM bacnet_gateways ORDER BY created_at ASC`)
    .all() as Array<{ id: string }>)
    .map((row) => getBacnetGatewayById(row.id))
    .filter((gateway): gateway is BacnetGatewayRecord => Boolean(gateway));
  let requeuedCount = 0;
  let deadLetterCount = 0;

  for (const gateway of gateways) {
    const policy = getGatewayDispatchPolicy(gateway);
    const delivered = db
      .prepare(
        `SELECT id, command_id, building_id, status, delivery_attempt_count, last_delivery_attempt_at, dispatched_at
         FROM gateway_command_dispatches
         WHERE gateway_id = ? AND status = 'delivered'
         ORDER BY created_at ASC`
      )
      .all(gateway.id) as Array<{
        id: string;
        command_id: string;
        building_id: string;
        status: string;
        delivery_attempt_count: number;
        last_delivery_attempt_at: string | null;
        dispatched_at: string | null;
      }>;

    for (const dispatch of delivered) {
      const lastAttemptAt = dispatch.last_delivery_attempt_at ?? dispatch.dispatched_at;
      if (!lastAttemptAt) {
        continue;
      }

      const ageMs = Date.parse(referenceTime) - Date.parse(lastAttemptAt);
      if (!Number.isFinite(ageMs) || ageMs < policy.timeoutSeconds * 1000) {
        continue;
      }

      if (dispatch.delivery_attempt_count >= policy.maxAttempts) {
        db.prepare(
          `UPDATE gateway_command_dispatches
           SET status = ?, error_message = ?, response_json = COALESCE(response_json, ?)
           WHERE id = ?`
        ).run(
          "dead_letter",
          `Dispatch timed out after ${dispatch.delivery_attempt_count} delivery attempt(s).`,
          JSON.stringify({ timeoutSeconds: policy.timeoutSeconds, maxAttempts: policy.maxAttempts }),
          dispatch.id
        );

        db.prepare(`UPDATE control_commands SET status = ?, execution_notes = ? WHERE id = ?`).run(
          "dispatch_failed",
          `Gateway dispatch timed out after ${dispatch.delivery_attempt_count} delivery attempt(s) and moved to dead letter.`,
          dispatch.command_id
        );

        recordAuditEvent({
          buildingId: dispatch.building_id,
          entityType: "gateway_command_dispatch",
          entityId: dispatch.id,
          action: "gateway_dispatch_dead_lettered",
          actorType: "system",
          summary: `Gateway dispatch ${dispatch.id} moved to dead letter after repeated timeouts.`,
          metadataJson: JSON.stringify({
            timeoutSeconds: policy.timeoutSeconds,
            maxAttempts: policy.maxAttempts,
            deliveryAttemptCount: dispatch.delivery_attempt_count
          })
        });

        deadLetterCount += 1;
      } else {
        db.prepare(
          `UPDATE gateway_command_dispatches
           SET status = ?, error_message = ?
           WHERE id = ?`
        ).run(
          "pending",
          `Dispatch timed out waiting for acknowledgement and was re-queued at ${referenceTime}.`,
          dispatch.id
        );

        db.prepare(`UPDATE control_commands SET status = ?, execution_notes = ? WHERE id = ?`).run(
          "dispatch_pending",
          `Gateway dispatch timed out waiting for acknowledgement and was re-queued (${dispatch.delivery_attempt_count}/${policy.maxAttempts}).`,
          dispatch.command_id
        );

        recordAuditEvent({
          buildingId: dispatch.building_id,
          entityType: "gateway_command_dispatch",
          entityId: dispatch.id,
          action: "gateway_dispatch_requeued",
          actorType: "system",
          summary: `Gateway dispatch ${dispatch.id} timed out and was re-queued.`,
          metadataJson: JSON.stringify({
            timeoutSeconds: policy.timeoutSeconds,
            maxAttempts: policy.maxAttempts,
            deliveryAttemptCount: dispatch.delivery_attempt_count
          })
        });

        requeuedCount += 1;
      }
    }
  }

  return {
    requeuedCount,
    deadLetterCount
  };
}

export function refreshGatewayRuntimeHealth(referenceTime = new Date().toISOString()) {
  const db = getDatabase();
  const gateways = (db
    .prepare(
      `SELECT id
       FROM bacnet_gateways
       ORDER BY created_at ASC`
    )
    .all() as Array<{ id: string }>)
    .map((row) => getBacnetGatewayById(row.id))
    .filter((gateway): gateway is BacnetGatewayRecord => Boolean(gateway));
  let onlineCount = 0;
  let staleCount = 0;

  for (const gateway of gateways) {
    if (!gateway.lastHeartbeatAt) {
      continue;
    }

    const interval = normalizePollIntervalSeconds(gateway.pollIntervalSeconds);
    const staleAfterMs = Math.max(interval * 3 * 1000, 15 * 60 * 1000);
    const ageMs = Date.parse(referenceTime) - Date.parse(gateway.lastHeartbeatAt);
    const heartbeatStatus = ageMs > staleAfterMs ? "stale" : "healthy";
    const gatewayStatus = heartbeatStatus === "stale" ? "stale" : "online";
    db.prepare(`UPDATE bacnet_gateways SET heartbeat_status = ?, status = ? WHERE id = ?`).run(
      heartbeatStatus,
      gatewayStatus,
      gateway.id
    );

    if (heartbeatStatus === "stale") {
      staleCount += 1;
    } else {
      onlineCount += 1;
    }
  }

  return {
    onlineCount,
    staleCount
  };
}

export function getMonitoringWorkspaceByBuildingId(buildingId: string): MonitoringWorkspace {
  return {
    gateways: listBacnetGatewaysByBuildingId(buildingId),
    assets: listMonitoringAssetsByBuildingId(buildingId),
    issues: getMonitoringIssuesByBuildingId(buildingId),
    basPoints: listBasPointsByBuildingId(buildingId),
    telemetryEvents: listTelemetryEventsByBuildingId(buildingId),
    recommendationActions: listRecommendationActionsByBuildingId(buildingId),
    discoveryRuns: listGatewayDiscoveryRunsByBuildingId(buildingId),
    dispatches: listGatewayCommandDispatchesByBuildingId(buildingId)
  };
}

export function startDiscoveryRun(buildingId: string): DiscoveryRunRecord {
  const db = getDatabase();
  const gateway = listBacnetGatewaysByBuildingId(buildingId)[0];

  if (gateway) {
    recordAuditEvent({
      buildingId,
      entityType: "discovery_run",
      entityId: `discover_${buildingId}`,
      action: "bacnet_discovery_requested",
      actorType: "operator",
      summary: `Gateway-backed discovery was requested for ${gateway.name}.`,
      metadataJson: JSON.stringify({ gatewayId: gateway.id })
    });

    return {
      id: `discover_${buildingId}`,
      buildingId,
      assetId: "",
      pointId: "",
      gatewayId: gateway.id,
      status: "queued"
    };
  }

  const existingAsset = db
    .prepare(
      `SELECT ma.id AS asset_id
       FROM monitoring_assets ma
       WHERE ma.building_id = ?
       LIMIT 1`
    )
    .get(buildingId) as { asset_id: string } | undefined;

  const assetId = existingAsset?.asset_id ?? makeId("asset");

  if (!existingAsset) {
    db.prepare(
      `INSERT INTO monitoring_assets (id, building_id, system_name, asset_type, protocol, vendor, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(assetId, buildingId, "Garage Exhaust System", "fan_system", "BACnet/IP", "Pilot BAS", "Garage", "active");
  }

  ensureDefaultDiscoveryPoints(db, assetId);

  const occupancyPoint = db
    .prepare(
      `SELECT id
       FROM bas_points
       WHERE monitoring_asset_id = ? AND canonical_point_type = 'occupancy_mode'
       LIMIT 1`
    )
    .get(assetId) as { id: string } | undefined;
  const pointId = occupancyPoint?.id ?? "";

  recordAuditEvent({
    buildingId,
    entityType: "discovery_run",
    entityId: `discover_${buildingId}`,
    action: "bacnet_discovery_started",
    actorType: "operator",
    summary: "BACnet discovery was started for the pilot building.",
    metadataJson: JSON.stringify({ assetId, pointId })
  });

  normalizeTelemetryEvents();
  evaluateMonitoringRulesForBuilding(buildingId);

  return {
    id: `discover_${buildingId}`,
    buildingId,
    assetId,
    pointId,
    gatewayId: undefined,
    status: existingAsset ? "existing" : "queued"
  };
}

function getPointExecutionContext(pointId: string) {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT bp.id, ma.building_id, bp.object_name, bp.canonical_point_type, bp.is_whitelisted, bp.is_writable, bp.safety_category, bp.metadata_json
       FROM bas_points bp
       INNER JOIN monitoring_assets ma ON ma.id = bp.monitoring_asset_id
       WHERE bp.id = ?`
    )
    .get(pointId) as
    | {
        id: string;
        building_id: string;
        object_name: string;
        canonical_point_type: MonitoringPointType | null;
        is_whitelisted: number;
        is_writable: number;
        safety_category: string | null;
        metadata_json: string | null;
      }
    | undefined;

  if (!row) {
    throw new Error(`BAS point not found: ${pointId}`);
  }

  return row;
}

function getPointCurrentValue(pointId: string) {
  const db = getDatabase();
  const point = getPointExecutionContext(pointId);
  const metadata = parseJsonObject(point.metadata_json);
  const currentValue = metadata.currentValue;

  if (typeof currentValue === "string" && currentValue.length > 0) {
    return currentValue;
  }

  const latestEvent = db
    .prepare(
      `SELECT value_text, value_numeric
       FROM telemetry_events
       WHERE point_id = ?
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get(pointId) as { value_text: string | null; value_numeric: number | null } | undefined;

  if (latestEvent?.value_text) {
    return latestEvent.value_text;
  }

  if (latestEvent?.value_numeric !== null && latestEvent?.value_numeric !== undefined) {
    return String(latestEvent.value_numeric);
  }

  return "auto";
}

function applyPointValue(pointId: string, value: string, reason: string) {
  const db = getDatabase();
  const point = getPointExecutionContext(pointId);
  const metadata = parseJsonObject(point.metadata_json);
  const nextMetadata = {
    ...metadata,
    currentValue: value,
    lastAppliedReason: reason,
    lastAppliedAt: new Date().toISOString()
  };

  db.prepare(`UPDATE bas_points SET metadata_json = ? WHERE id = ?`).run(JSON.stringify(nextMetadata), pointId);
  ingestSensorReading({
    buildingId: point.building_id,
    pointId,
    systemId: undefined,
    value,
    qualityFlag: "ok",
    timestamp: new Date().toISOString()
  });
}

export function listControlCommands(): ControlCommandRecord[] {
  const db = getDatabase();

  return db
    .prepare(
      `SELECT id, building_id, point_id, command_type, previous_value, requested_value, requested_at, approved_at, executed_at, expires_at, expired_at, rollback_policy, rollback_value, rollback_executed_at, execution_notes, status
       FROM control_commands
       ORDER BY requested_at DESC`
    )
    .all()
    .map((row) => {
      const typedRow = row as {
        id: string;
        building_id: string;
        point_id: string;
        command_type: string;
        previous_value: string | null;
        requested_value: string;
        requested_at: string;
        approved_at: string | null;
        executed_at: string | null;
        expires_at: string | null;
        expired_at: string | null;
        rollback_policy: string | null;
        rollback_value: string | null;
        rollback_executed_at: string | null;
        execution_notes: string | null;
        status: string;
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        pointId: typedRow.point_id,
        commandType: typedRow.command_type,
        previousValue: typedRow.previous_value ?? undefined,
        requestedValue: typedRow.requested_value,
        requestedAt: typedRow.requested_at,
        approvedAt: typedRow.approved_at ?? undefined,
        executedAt: typedRow.executed_at ?? undefined,
        expiresAt: typedRow.expires_at ?? undefined,
        expiredAt: typedRow.expired_at ?? undefined,
        rollbackPolicy: typedRow.rollback_policy ?? undefined,
        rollbackValue: typedRow.rollback_value ?? undefined,
        rollbackExecutedAt: typedRow.rollback_executed_at ?? undefined,
        executionNotes: typedRow.execution_notes ?? undefined,
        status: typedRow.status
      };
    });
}

export function getControlCommandById(commandId: string): ControlCommandRecord | null {
  return listControlCommands().find((command) => command.id === commandId) ?? null;
}

export function createControlCommand(input: {
  buildingId: string;
  pointId: string;
  commandType: string;
  requestedValue: string;
  expiresAt?: string;
}) {
  const db = getDatabase();
  const point = getPointExecutionContext(input.pointId);

  if (!point.is_writable || !point.is_whitelisted) {
    throw new Error(`BAS point ${input.pointId} is not approved for supervised write-back.`);
  }

  if (point.safety_category?.toLowerCase() === "life_safety") {
    throw new Error(`BAS point ${input.pointId} is marked as life-safety and cannot be commanded.`);
  }

  const command = {
    id: makeId("cmd"),
    buildingId: input.buildingId,
    pointId: input.pointId,
    commandType: input.commandType,
    previousValue: getPointCurrentValue(input.pointId),
    requestedValue: input.requestedValue,
    requestedAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    rollbackPolicy: "auto_on_expiry",
    status: "pending_approval"
  };

  db.prepare(
    `INSERT INTO control_commands (
      id, building_id, point_id, command_type, previous_value, requested_value, requested_at, approved_at, executed_at, expires_at, expired_at, rollback_policy, rollback_value, rollback_executed_at, execution_notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    command.id,
    command.buildingId,
    command.pointId,
    command.commandType,
    command.previousValue,
    command.requestedValue,
    command.requestedAt,
    null,
    null,
    command.expiresAt ?? null,
    null,
    command.rollbackPolicy,
    command.previousValue,
    null,
    null,
    command.status
  );

  recordAuditEvent({
    buildingId: command.buildingId,
    entityType: "control_command",
    entityId: command.id,
    action: "command_requested",
    actorType: "operator",
    summary: `${command.commandType} command was requested for point ${command.pointId}.`,
    metadataJson: JSON.stringify({
      pointId: command.pointId,
      requestedValue: command.requestedValue,
      previousValue: command.previousValue,
      expiresAt: command.expiresAt ?? null
    })
  });

  return command;
}

function executeApprovedControlCommand(commandId: string) {
  const db = getDatabase();
  const existing = listControlCommands().find((command) => command.id === commandId);

  if (!existing || (existing.status !== "approved" && existing.status !== "pending_approval")) {
    return existing ?? null;
  }

  const executedAt = new Date().toISOString();
  applyPointValue(existing.pointId, existing.requestedValue, `command:${commandId}`);
  db.prepare(
    `UPDATE control_commands
     SET status = ?, executed_at = ?, execution_notes = ?
     WHERE id = ?`
  ).run("executed", executedAt, "Command executed in local pilot simulation.", commandId);

  recordAuditEvent({
    buildingId: existing.buildingId,
    entityType: "control_command",
    entityId: commandId,
    action: "command_executed",
    actorType: "system",
    summary: `${existing.commandType} command was executed for point ${existing.pointId}.`,
    metadataJson: JSON.stringify({
      requestedValue: existing.requestedValue,
      previousValue: existing.previousValue ?? null,
      executedAt
    })
  });

  return listControlCommands().find((command) => command.id === commandId) ?? null;
}

export function approveControlCommand(commandId: string) {
  const db = getDatabase();
  const existing = db
    .prepare(
      `SELECT id, building_id, point_id, command_type, previous_value, requested_value, requested_at, expires_at, rollback_policy, status
       FROM control_commands WHERE id = ?`
    )
    .get(commandId) as
    | {
        id: string;
        building_id: string;
        point_id: string;
        command_type: string;
        previous_value: string | null;
        requested_value: string;
        requested_at: string;
        expires_at: string | null;
        rollback_policy: string | null;
        status: string;
      }
    | undefined;

  if (!existing) {
    return null;
  }

  const approvedAt = new Date().toISOString();
  db.prepare(`UPDATE control_commands SET status = ?, approved_at = ? WHERE id = ?`).run("approved", approvedAt, commandId);

  recordAuditEvent({
    buildingId: existing.building_id,
    entityType: "control_command",
    entityId: existing.id,
    action: "command_approved",
    actorType: "owner",
    summary: `${existing.command_type} command was approved for point ${existing.point_id}.`,
    metadataJson: JSON.stringify({ requestedValue: existing.requested_value, approvedAt })
  });

  const dispatch = queueGatewayCommandDispatch(commandId);

  if (dispatch) {
    if (dispatch.runtimeMode === "loopback") {
      processPendingGatewayCommandDispatches(dispatch.gatewayId);
    }

    return getControlCommandById(commandId);
  }

  return executeApprovedControlCommand(commandId);
}

export function expireControlCommands(referenceTime = new Date().toISOString()) {
  const db = getDatabase();
  const expirableCommands = listControlCommands().filter(
    (command) =>
      command.status === "executed" && Boolean(command.expiresAt) && Date.parse(command.expiresAt ?? "") <= Date.parse(referenceTime)
  );

  for (const command of expirableCommands) {
    applyPointValue(command.pointId, command.rollbackValue ?? command.previousValue ?? "auto", `rollback:${command.id}`);
    db.prepare(
      `UPDATE control_commands
       SET status = ?, expired_at = ?, rollback_executed_at = ?, execution_notes = ?
       WHERE id = ?`
    ).run(
      "rolled_back",
      referenceTime,
      referenceTime,
      "Temporary override expired and rollback was applied in local pilot simulation.",
      command.id
    );

    recordAuditEvent({
      buildingId: command.buildingId,
      entityType: "control_command",
      entityId: command.id,
      action: "command_rolled_back",
      actorType: "system",
      summary: `${command.commandType} command expired and rolled back for point ${command.pointId}.`,
      metadataJson: JSON.stringify({
        rollbackValue: command.rollbackValue ?? command.previousValue ?? "auto",
        expiredAt: referenceTime
      })
    });
  }

  return {
    referenceTime,
    expiredCount: expirableCommands.length,
    commands: listControlCommands().filter((command) =>
      expirableCommands.some((expiredCommand) => expiredCommand.id === command.id)
    )
  };
}
