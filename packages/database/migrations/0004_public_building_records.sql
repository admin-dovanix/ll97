CREATE TABLE IF NOT EXISTS public_building_records (
  id TEXT PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  source_version TEXT,
  address_line_1 TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  bbl TEXT,
  bin TEXT,
  covered_status TEXT,
  compliance_pathway TEXT,
  article TEXT,
  gross_sq_ft NUMERIC,
  source_row_json TEXT,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS building_public_matches (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  public_record_id TEXT NOT NULL REFERENCES public_building_records(id),
  match_method TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'matched',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_public_building_records_bbl
  ON public_building_records(bbl);

CREATE INDEX IF NOT EXISTS idx_public_building_records_bin
  ON public_building_records(bin);

CREATE INDEX IF NOT EXISTS idx_building_public_matches_building_id
  ON building_public_matches(building_id);
