ALTER TABLE bacnet_gateways ADD COLUMN ingest_token TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN runtime_mode TEXT NOT NULL DEFAULT 'outbox';
ALTER TABLE bacnet_gateways ADD COLUMN command_endpoint TEXT;

CREATE TABLE IF NOT EXISTS gateway_command_dispatches (
  id TEXT PRIMARY KEY,
  gateway_id TEXT NOT NULL REFERENCES bacnet_gateways(id),
  command_id TEXT NOT NULL REFERENCES control_commands(id),
  building_id TEXT NOT NULL REFERENCES buildings(id),
  point_id TEXT NOT NULL REFERENCES bas_points(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  response_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TEXT,
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_gateway_command_dispatches_gateway_status
  ON gateway_command_dispatches(gateway_id, status);

CREATE INDEX IF NOT EXISTS idx_gateway_command_dispatches_command_id
  ON gateway_command_dispatches(command_id);
