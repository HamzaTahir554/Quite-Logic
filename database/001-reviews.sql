BEGIN;
CREATE TABLE IF NOT EXISTS admins (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash text PRIMARY KEY, admin_id uuid NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS clients (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, name text NOT NULL, company text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
 id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES clients(id), name text NOT NULL, company text NOT NULL DEFAULT '', role text NOT NULL DEFAULT '', service text NOT NULL,
 rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5), body text NOT NULL CHECK (length(body) BETWEEN 20 AND 3000), status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
 image bytea, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_status_date ON reviews(status, created_at DESC);
CREATE TABLE IF NOT EXISTS messages (
 id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES clients(id), subject text NOT NULL, body text NOT NULL, details jsonb NOT NULL DEFAULT '{}', delivery_status text NOT NULL DEFAULT 'Received', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_history (
 id uuid PRIMARY KEY, client_id uuid NOT NULL REFERENCES clients(id), admin_id uuid REFERENCES admins(id) ON DELETE SET NULL, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'Sending', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS request_limits (
 key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiration ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS reviews_client_date ON reviews(client_id,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_client_date ON messages(client_id,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_date ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS emails_date ON email_history(created_at DESC);
CREATE INDEX IF NOT EXISTS limits_expiration ON request_limits(expires_at);
COMMIT;
