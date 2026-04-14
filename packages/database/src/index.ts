import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type {
  AuditActorType,
  AuditEvent,
  BeforeAfterSummary,
  Building,
  BuildingComplianceSummary,
  CompliancePathway,
  ComplianceRequirement,
  EvidenceLinkStatus,
  MonitoringPointType,
  MonitoringIssue,
  RecommendationAction,
  RecommendationActionStatus
} from "@airwise/domain";
import {
  calculateEmissionsPenalty,
  calculateLateReportPenalty,
  canonicalPointTypes,
  pathwayMetadata,
  writablePointTypes
} from "@airwise/rules";

export const initialMigrations = [
  "0001_initial.sql",
  "0002_audit_events.sql",
  "0003_recommendation_actions.sql",
  "0004_public_building_records.sql",
  "0005_command_lifecycle.sql"
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
      id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "pub_001",
    "dob_covered_buildings",
    "2026",
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
        id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "pub_001",
      "dob_covered_buildings",
      "2026",
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

export type DocumentRecord = {
  id: string;
  buildingId: string;
  documentType: string;
  fileUrl: string;
  classificationConfidence?: number;
  status: string;
};

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
  status: "queued" | "existing";
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

export type PublicBuildingRecord = {
  id: string;
  datasetName: string;
  sourceVersion?: string;
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

export type MonitoringWorkspace = {
  issues: MonitoringIssue[];
  basPoints: BasPointRecord[];
  telemetryEvents: TelemetryEventRecord[];
  recommendationActions: RecommendationAction[];
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
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

function normalizeCompliancePathway(pathway?: string | null): CompliancePathway {
  return pathway === "CP0" || pathway === "CP1" || pathway === "CP2" || pathway === "CP3" || pathway === "CP4"
    ? pathway
    : "UNKNOWN";
}

function normalizeArticle(article?: string | null): Building["article"] {
  return article === "320" || article === "321" ? article : "UNKNOWN";
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
      `SELECT id, portfolio_id, name, address_line_1, city, state, zip, bbl, bin, dof_gsf, reported_gfa, pathway, article
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
          `SELECT id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
           FROM public_building_records
           WHERE dataset_name = ?
           ORDER BY imported_at DESC, id DESC`
        )
        .all(datasetName)
    : db
        .prepare(
          `SELECT id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
           FROM public_building_records
           ORDER BY imported_at DESC, id DESC`
        )
        .all();

  return rows.map((row) => {
    const typedRow = row as {
      id: string;
      dataset_name: string;
      source_version: string | null;
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

  const rows = db
    .prepare(
      `SELECT id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
       FROM public_building_records
       WHERE (bbl IS NOT NULL AND bbl = ?)
          OR (bin IS NOT NULL AND bin = ?)
          OR (LOWER(address_line_1) = LOWER(?) AND LOWER(COALESCE(city, '')) = LOWER(?))
       ORDER BY
         CASE
           WHEN bbl IS NOT NULL AND bbl = ? THEN 1
           WHEN bin IS NOT NULL AND bin = ? THEN 2
           ELSE 3
         END,
         imported_at DESC`
    )
    .all(building.bbl ?? "", building.bin ?? "", building.addressLine1, building.city, building.bbl ?? "", building.bin ?? "");

  return rows.map((row) => {
    const typedRow = row as {
      id: string;
      dataset_name: string;
      source_version: string | null;
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
    sourceRowJson?: string;
  }>;
}) {
  const db = getDatabase();
  const insert = db.prepare(
    `INSERT INTO public_building_records (
      id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft, source_row_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const row of input.rows) {
    insert.run(
      makeId("pub"),
      input.datasetName,
      input.sourceVersion ?? null,
      row.addressLine1,
      row.city ?? null,
      row.state ?? null,
      row.zip ?? null,
      row.bbl ?? null,
      row.bin ?? null,
      row.coveredStatus ?? null,
      row.compliancePathway ?? null,
      row.article ?? null,
      row.grossSquareFeet ?? null,
      row.sourceRowJson ?? null
    );
  }

  return {
    datasetName: input.datasetName,
    sourceVersion: input.sourceVersion,
    importedCount: input.rows.length
  };
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
      `SELECT id, dataset_name, source_version, address_line_1, city, state, zip, bbl, bin, covered_status, compliance_pathway, article, gross_sq_ft
       FROM public_building_records
       WHERE id = ?`
    )
    .get(publicRecordId) as
    | {
        id: string;
        dataset_name: string;
        source_version: string | null;
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
      `SELECT id, building_id, document_type, file_url, classification_confidence, status
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
      };

      return {
        id: typedRow.id,
        buildingId: typedRow.building_id,
        documentType: typedRow.document_type,
        fileUrl: typedRow.file_url,
        classificationConfidence: typedRow.classification_confidence ?? undefined,
        status: typedRow.status
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

export function createDocument(input: { buildingId: string; documentType: string; fileUrl?: string }) {
  const db = getDatabase();
  const document = {
    id: makeId("doc"),
    buildingId: input.buildingId,
    documentType: input.documentType,
    fileUrl: input.fileUrl ?? `file://airwise/${input.buildingId}/${input.documentType.replaceAll(" ", "-")}`,
    classificationConfidence: 0.75,
    status: "uploaded"
  };

  db.prepare(
    `INSERT INTO documents (id, building_id, document_type, file_url, classification_confidence, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    document.id,
    document.buildingId,
    document.documentType,
    document.fileUrl,
    document.classificationConfidence,
    document.status
  );

  recordAuditEvent({
    buildingId: document.buildingId,
    entityType: "document",
    entityId: document.id,
    action: "document_uploaded",
    actorType: "owner",
    summary: `${document.documentType} document was attached to the building workspace.`,
    metadataJson: JSON.stringify({ fileUrl: document.fileUrl, status: document.status })
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

export function getMonitoringWorkspaceByBuildingId(buildingId: string): MonitoringWorkspace {
  return {
    issues: getMonitoringIssuesByBuildingId(buildingId),
    basPoints: listBasPointsByBuildingId(buildingId),
    telemetryEvents: listTelemetryEventsByBuildingId(buildingId),
    recommendationActions: listRecommendationActionsByBuildingId(buildingId)
  };
}

export function startDiscoveryRun(buildingId: string): DiscoveryRunRecord {
  const db = getDatabase();
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
