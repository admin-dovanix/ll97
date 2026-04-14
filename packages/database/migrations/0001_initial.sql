CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE buildings (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  name TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  bbl TEXT,
  bin TEXT,
  dof_gsf NUMERIC,
  reported_gfa NUMERIC,
  article TEXT,
  pathway TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coverage_records (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  filing_year INTEGER NOT NULL,
  covered_status TEXT NOT NULL,
  compliance_pathway TEXT NOT NULL,
  pathway_tier TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_version TEXT,
  source_date TEXT,
  is_disputed BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_score NUMERIC,
  notes TEXT
);

CREATE TABLE compliance_requirements (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  reporting_year INTEGER NOT NULL,
  requirement_type TEXT NOT NULL,
  status TEXT NOT NULL,
  due_date DATE NOT NULL,
  required_role TEXT NOT NULL,
  blocking_reason TEXT
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  classification_confidence NUMERIC,
  status TEXT NOT NULL
);

CREATE TABLE document_evidence_links (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  requirement_id TEXT NOT NULL REFERENCES compliance_requirements(id),
  link_status TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE monitoring_assets (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  system_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  protocol TEXT NOT NULL,
  vendor TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE bas_points (
  id TEXT PRIMARY KEY,
  monitoring_asset_id TEXT NOT NULL REFERENCES monitoring_assets(id),
  object_identifier TEXT NOT NULL,
  object_name TEXT NOT NULL,
  canonical_point_type TEXT,
  unit TEXT,
  is_writable BOOLEAN NOT NULL DEFAULT FALSE,
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  safety_category TEXT,
  metadata_json TEXT
);

CREATE TABLE telemetry_events (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  system_id TEXT,
  point_id TEXT,
  timestamp TEXT NOT NULL,
  value_numeric NUMERIC,
  value_text TEXT,
  unit TEXT,
  quality_flag TEXT
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  system_id TEXT,
  issue_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  writeback_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_score NUMERIC,
  status TEXT NOT NULL,
  assigned_to TEXT
);

CREATE TABLE control_commands (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  point_id TEXT NOT NULL REFERENCES bas_points(id),
  command_type TEXT NOT NULL,
  previous_value TEXT,
  requested_value TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  expires_at TEXT,
  rollback_policy TEXT,
  status TEXT NOT NULL
);
