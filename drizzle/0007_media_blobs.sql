-- Store uploaded media in Neon/PostgreSQL when object storage is not configured.
CREATE TABLE IF NOT EXISTS media_blob (
  asset_id uuid PRIMARY KEY REFERENCES media_asset(id) ON DELETE CASCADE,
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
