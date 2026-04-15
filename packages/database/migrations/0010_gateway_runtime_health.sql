ALTER TABLE bacnet_gateways ADD COLUMN agent_version TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN last_heartbeat_at TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN heartbeat_status TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE bacnet_gateways ADD COLUMN poll_interval_seconds INTEGER NOT NULL DEFAULT 300;
ALTER TABLE bacnet_gateways ADD COLUMN last_poll_requested_at TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN last_poll_completed_at TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN next_poll_due_at TEXT;
ALTER TABLE bacnet_gateways ADD COLUMN runtime_metadata_json TEXT;

ALTER TABLE gateway_command_dispatches ADD COLUMN delivery_attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gateway_command_dispatches ADD COLUMN last_delivery_attempt_at TEXT;
