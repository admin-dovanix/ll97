ALTER TABLE control_commands ADD COLUMN approved_at TEXT;
ALTER TABLE control_commands ADD COLUMN executed_at TEXT;
ALTER TABLE control_commands ADD COLUMN expired_at TEXT;
ALTER TABLE control_commands ADD COLUMN rollback_executed_at TEXT;
ALTER TABLE control_commands ADD COLUMN rollback_value TEXT;
ALTER TABLE control_commands ADD COLUMN execution_notes TEXT;
