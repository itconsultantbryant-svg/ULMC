-- Explicit media references per revision so replacing an image in a later
-- revision never changes what an already-approved revision published.
CREATE TABLE article_revision_media (
  revision_id uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  media_id    uuid NOT NULL REFERENCES media_asset(id) ON DELETE CASCADE,
  PRIMARY KEY (revision_id, media_id)
);
CREATE INDEX article_revision_media_media_idx ON article_revision_media(media_id);
