CREATE TABLE reporting_cycles (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  reporting_year INTEGER NOT NULL,
  filing_status TEXT NOT NULL DEFAULT 'draft',
  extension_requested BOOLEAN NOT NULL DEFAULT FALSE,
  filing_due_date TEXT NOT NULL,
  extended_due_date TEXT,
  pathway_snapshot TEXT,
  article_snapshot TEXT,
  cbl_version TEXT,
  cbl_dispute_status TEXT,
  owner_of_record_status TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(building_id, reporting_year)
);

CREATE TABLE reporting_input_packages (
  id TEXT PRIMARY KEY,
  reporting_cycle_id TEXT NOT NULL REFERENCES reporting_cycles(id),
  package_status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reporting_cycle_id)
);

CREATE TABLE input_values (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES reporting_input_packages(id),
  field_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  confidence_score NUMERIC,
  review_status TEXT NOT NULL DEFAULT 'pending_review',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE documents ADD COLUMN document_category TEXT NOT NULL DEFAULT 'owner_attestation';
ALTER TABLE documents ADD COLUMN reporting_year INTEGER;
ALTER TABLE documents ADD COLUMN parsed_status TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE documents ADD COLUMN parser_type TEXT;
ALTER TABLE documents ADD COLUMN parser_version TEXT;

CREATE TABLE document_extractions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  field_key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  page_ref TEXT,
  extraction_method TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE filing_modules (
  id TEXT PRIMARY KEY,
  reporting_cycle_id TEXT NOT NULL REFERENCES reporting_cycles(id),
  module_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  due_date TEXT NOT NULL,
  prerequisite_state TEXT NOT NULL DEFAULT 'not_started',
  blocking_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reporting_cycle_id, module_type)
);

CREATE TABLE attestations (
  id TEXT PRIMARY KEY,
  reporting_cycle_id TEXT NOT NULL REFERENCES reporting_cycles(id),
  role TEXT NOT NULL,
  signer_name TEXT,
  owner_of_record_match_status TEXT NOT NULL DEFAULT 'unknown',
  completion_status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reporting_cycle_id, role)
);

CREATE TABLE article_321_pecm_statuses (
  id TEXT PRIMARY KEY,
  reporting_cycle_id TEXT NOT NULL REFERENCES reporting_cycles(id),
  pecm_key TEXT NOT NULL,
  pecm_label TEXT NOT NULL,
  applicability TEXT NOT NULL DEFAULT 'unknown',
  compliance_status TEXT NOT NULL DEFAULT 'unknown',
  evidence_state TEXT NOT NULL DEFAULT 'missing',
  reviewer_role TEXT NOT NULL DEFAULT 'rcxa',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reporting_cycle_id, pecm_key)
);

CREATE TABLE calculation_runs (
  id TEXT PRIMARY KEY,
  reporting_cycle_id TEXT NOT NULL REFERENCES reporting_cycles(id),
  calculation_version TEXT NOT NULL,
  missing_required_inputs_json TEXT NOT NULL,
  needs_review_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  calculation_outputs_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
