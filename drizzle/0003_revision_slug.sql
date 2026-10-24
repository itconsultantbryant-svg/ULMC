-- A replacement revision may propose a new public slug. The live slug only
-- changes after publication, at which point a redirect is recorded.
ALTER TABLE article_revision ADD COLUMN slug_override text;
