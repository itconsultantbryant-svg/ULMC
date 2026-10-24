CREATE TABLE IF NOT EXISTS contact_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_message_created_at_idx ON contact_message (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_message_status_idx ON contact_message (status);
