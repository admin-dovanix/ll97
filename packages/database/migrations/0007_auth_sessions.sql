CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_portfolio_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  portfolio_id TEXT NOT NULL REFERENCES portfolios(id),
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, portfolio_id, role)
);

CREATE TABLE IF NOT EXISTS app_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  active_membership_id TEXT REFERENCES user_portfolio_memberships(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_portfolio_memberships_user
  ON user_portfolio_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_user_portfolio_memberships_portfolio
  ON user_portfolio_memberships(portfolio_id);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user
  ON app_sessions(user_id);
