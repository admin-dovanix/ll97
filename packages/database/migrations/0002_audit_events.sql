CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  building_id TEXT REFERENCES buildings(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_events_building_id ON audit_events(building_id);
CREATE INDEX IF NOT EXISTS idx_document_evidence_links_requirement_id ON document_evidence_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_document_evidence_links_document_id ON document_evidence_links(document_id);
