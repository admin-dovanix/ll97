CREATE TABLE IF NOT EXISTS public_import_runs (
  id TEXT PRIMARY KEY,
  dataset_name TEXT NOT NULL,
  source_version TEXT,
  source_file TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  summary_json TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

ALTER TABLE public_building_records ADD COLUMN source_record_key TEXT;
ALTER TABLE public_building_records ADD COLUMN normalized_address_key TEXT;

CREATE INDEX IF NOT EXISTS idx_public_building_records_dataset_version_record
  ON public_building_records(dataset_name, source_version, source_record_key);

CREATE INDEX IF NOT EXISTS idx_public_building_records_normalized_address
  ON public_building_records(normalized_address_key);
