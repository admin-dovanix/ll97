CREATE TABLE IF NOT EXISTS recommendation_actions (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id),
  building_id TEXT NOT NULL REFERENCES buildings(id),
  action_type TEXT NOT NULL,
  action_status TEXT NOT NULL DEFAULT 'proposed',
  assignee TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_building_id
  ON recommendation_actions(building_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_recommendation_id
  ON recommendation_actions(recommendation_id);
