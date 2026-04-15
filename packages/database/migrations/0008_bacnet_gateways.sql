CREATE TABLE IF NOT EXISTS bacnet_gateways (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  name TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'BACnet/IP',
  vendor TEXT,
  host TEXT,
  port INTEGER,
  status TEXT NOT NULL DEFAULT 'configured',
  auth_type TEXT,
  metadata_json TEXT,
  last_seen_at TEXT,
  last_discovery_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bacnet_gateway_discovery_runs (
  id TEXT PRIMARY KEY,
  gateway_id TEXT NOT NULL REFERENCES bacnet_gateways(id),
  building_id TEXT NOT NULL REFERENCES buildings(id),
  source TEXT NOT NULL DEFAULT 'gateway_snapshot',
  asset_count INTEGER NOT NULL DEFAULT 0,
  point_count INTEGER NOT NULL DEFAULT 0,
  telemetry_event_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  summary_json TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

ALTER TABLE monitoring_assets ADD COLUMN source_gateway_id TEXT REFERENCES bacnet_gateways(id);
ALTER TABLE monitoring_assets ADD COLUMN source_asset_key TEXT;
ALTER TABLE bas_points ADD COLUMN source_point_key TEXT;

CREATE INDEX IF NOT EXISTS idx_bacnet_gateways_building_id
  ON bacnet_gateways(building_id);

CREATE INDEX IF NOT EXISTS idx_bacnet_gateway_discovery_runs_building_id
  ON bacnet_gateway_discovery_runs(building_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_assets_gateway_asset_key
  ON monitoring_assets(source_gateway_id, source_asset_key);

CREATE INDEX IF NOT EXISTS idx_bas_points_source_point_key
  ON bas_points(monitoring_asset_id, source_point_key);
