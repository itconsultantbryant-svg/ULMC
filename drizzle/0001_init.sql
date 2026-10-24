-- University of Liberia — Department of Communication and Media Studies
-- Initial schema. All timestamps are stored in UTC (timestamptz).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===========================================================================
-- Authentication (Better Auth core + two-factor plugin)
-- ===========================================================================

CREATE TABLE "user" (
  id                text PRIMARY KEY,
  name              text NOT NULL,
  email             text NOT NULL,
  email_verified    boolean NOT NULL DEFAULT false,
  image             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  role              text NOT NULL DEFAULT 'staff',
  banned            boolean NOT NULL DEFAULT false,
  ban_reason        text,
  ban_expires       timestamptz,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  slug              text,
  title             text,
  bio               text,
  last_login_at     timestamptz,
  CONSTRAINT user_email_unique UNIQUE (email),
  CONSTRAINT user_slug_unique UNIQUE (slug),
  CONSTRAINT user_role_check CHECK (role ~ '^(staff|editor|admin|super_admin)(,(staff|editor|admin|super_admin))*$')
);

CREATE TABLE session (
  id            text PRIMARY KEY,
  expires_at    timestamptz NOT NULL,
  token         text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  ip_address    text,
  user_agent    text,
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session(user_id);
CREATE INDEX session_expires_idx ON session(expires_at);

CREATE TABLE account (
  id                      text PRIMARY KEY,
  account_id              text NOT NULL,
  provider_id             text NOT NULL,
  user_id                 text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token            text,
  refresh_token           text,
  id_token                text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope                   text,
  password                text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_idx ON account(user_id);
CREATE UNIQUE INDEX account_provider_unique ON account(provider_id, account_id);

CREATE TABLE verification (
  id          text PRIMARY KEY,
  identifier  text NOT NULL,
  value       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE two_factor (
  id                       text PRIMARY KEY,
  secret                   text NOT NULL,
  backup_codes             text NOT NULL,
  user_id                  text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  verified                 boolean NOT NULL DEFAULT true,
  failed_verification_count integer NOT NULL DEFAULT 0,
  locked_until             timestamptz
);
CREATE INDEX two_factor_user_idx ON two_factor(user_id);

-- ===========================================================================
-- Invitations
-- ===========================================================================
CREATE TABLE invitation (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  role         text NOT NULL,
  name         text,
  token_hash   text NOT NULL UNIQUE,
  invited_by   text REFERENCES "user"(id) ON DELETE SET NULL,
  expires_at   timestamptz NOT NULL,
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_role_check CHECK (role IN ('staff','editor','admin'))
);
CREATE INDEX invitation_email_idx ON invitation(lower(email));
CREATE UNIQUE INDEX invitation_pending_email_unique
  ON invitation(lower(email)) WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ===========================================================================
-- Media
-- ===========================================================================
CREATE TABLE media_asset (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_driver text NOT NULL DEFAULT 'local',
  storage_key    text NOT NULL,
  original_name  text,
  mime_type      text NOT NULL,
  size_bytes     bigint NOT NULL DEFAULT 0,
  width          integer,
  height         integer,
  checksum       text,
  alt            text NOT NULL DEFAULT '',
  caption        text,
  credit         text,
  rights         text,
  is_private     boolean NOT NULL DEFAULT true,
  variants       jsonb NOT NULL DEFAULT '{}'::jsonb,
  blur_data_url  text,
  uploaded_by    text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_created_idx ON media_asset(created_at DESC);
CREATE INDEX media_uploader_idx ON media_asset(uploaded_by);

-- ===========================================================================
-- Taxonomy
-- ===========================================================================
CREATE TABLE category (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  kind        text NOT NULL DEFAULT 'news',
  order_index integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tag (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Articles, revisions, workflow
-- ===========================================================================
CREATE TABLE article (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text NOT NULL UNIQUE,
  category_id           uuid REFERENCES category(id) ON DELETE SET NULL,
  content_type          text NOT NULL DEFAULT 'news',
  workflow_status       text NOT NULL DEFAULT 'draft',
  published_revision_id uuid,
  working_revision_id   uuid,
  featured              boolean NOT NULL DEFAULT false,
  featured_rank         integer NOT NULL DEFAULT 0,
  allow_comments        boolean NOT NULL DEFAULT true,
  comments_closed_at    timestamptz,
  created_by            text NOT NULL REFERENCES "user"(id),
  assigned_editor_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  published_at          timestamptz,
  scheduled_for         timestamptz,
  archived_at           timestamptz,
  unpublished_at        timestamptz,
  unpublish_reason      text,
  lock_version          integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_content_type_check CHECK (content_type IN
    ('news','campus','education','community','media_society','research','feature','opinion','student','announcement','sponsored')),
  CONSTRAINT article_workflow_check CHECK (workflow_status IN
    ('draft','submitted','in_review','changes_requested','resubmitted','editorially_approved','admin_approved','published','scheduled','rejected','archived','unpublished'))
);
CREATE INDEX article_workflow_idx ON article(workflow_status, updated_at DESC);
CREATE INDEX article_published_idx ON article(published_at DESC) WHERE published_revision_id IS NOT NULL;
CREATE INDEX article_category_idx ON article(category_id, published_at DESC);
CREATE INDEX article_author_idx ON article(created_by);
CREATE INDEX article_editor_idx ON article(assigned_editor_id);
CREATE INDEX article_scheduled_idx ON article(scheduled_for) WHERE workflow_status = 'scheduled';

CREATE TABLE article_revision (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  subtitle        text,
  summary         text NOT NULL DEFAULT '',
  body_html       text NOT NULL DEFAULT '',
  body_json       jsonb,
  seo_title       text,
  seo_description text,
  canonical_url   text,
  hero_media_id   uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  hero_caption    text,
  hero_credit     text,
  hero_alt        text,
  content_hash    text NOT NULL,
  word_count      integer NOT NULL DEFAULT 0,
  reading_minutes integer NOT NULL DEFAULT 1,
  created_by      text NOT NULL REFERENCES "user"(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  locked_at       timestamptz,
  CONSTRAINT article_revision_number_unique UNIQUE (article_id, revision_number)
);
CREATE INDEX article_revision_article_idx ON article_revision(article_id, revision_number DESC);

ALTER TABLE article
  ADD CONSTRAINT article_published_revision_fk FOREIGN KEY (published_revision_id)
  REFERENCES article_revision(id) ON DELETE SET NULL;
ALTER TABLE article
  ADD CONSTRAINT article_working_revision_fk FOREIGN KEY (working_revision_id)
  REFERENCES article_revision(id) ON DELETE SET NULL;

CREATE TABLE article_revision_author (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id   uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  user_id       text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  byline_name   text,
  byline_order  integer NOT NULL DEFAULT 0,
  author_role   text NOT NULL DEFAULT 'author',
  CONSTRAINT article_revision_author_unique UNIQUE (revision_id, user_id, author_role)
);
CREATE INDEX article_revision_author_rev_idx ON article_revision_author(revision_id);

CREATE TABLE article_tag (
  article_id uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE editorial_assignment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  editor_id   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_by text REFERENCES "user"(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'active',
  due_at      timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);
CREATE INDEX editorial_assignment_editor_idx ON editorial_assignment(editor_id, status);
CREATE INDEX editorial_assignment_article_idx ON editorial_assignment(article_id);

CREATE TABLE editorial_comment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES editorial_comment(id) ON DELETE CASCADE,
  root_id     uuid,
  author_id   text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body        text NOT NULL,
  anchor_text text,
  anchor_path text,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by text REFERENCES "user"(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX editorial_comment_revision_idx ON editorial_comment(revision_id, created_at);
CREATE INDEX editorial_comment_root_idx ON editorial_comment(root_id);

CREATE TABLE editorial_review (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id  uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  editor_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  decision     text NOT NULL,
  checklist    jsonb NOT NULL DEFAULT '{}'::jsonb,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  CONSTRAINT editorial_review_decision_check CHECK (decision IN ('approved','changes_requested','rejected'))
);
CREATE INDEX editorial_review_revision_idx ON editorial_review(revision_id);

CREATE TABLE admin_approval (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id         uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id        uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  admin_id           text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  editorial_review_id uuid REFERENCES editorial_review(id) ON DELETE SET NULL,
  decision           text NOT NULL,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  invalidated_at     timestamptz,
  CONSTRAINT admin_approval_decision_check CHECK (decision IN ('approved','returned','rejected'))
);
CREATE INDEX admin_approval_revision_idx ON admin_approval(revision_id);

CREATE TABLE workflow_transition (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id uuid REFERENCES article_revision(id) ON DELETE SET NULL,
  actor_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  from_status text NOT NULL,
  to_status   text NOT NULL,
  reason      text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflow_transition_article_idx ON workflow_transition(article_id, created_at DESC);

CREATE TABLE publication_schedule (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id     uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  scheduled_for   timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  idempotency_key text NOT NULL UNIQUE,
  created_by      text NOT NULL REFERENCES "user"(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  cancelled_at    timestamptz,
  last_error      text,
  CONSTRAINT publication_schedule_status_check CHECK (status IN ('pending','published','cancelled','failed'))
);
CREATE INDEX publication_schedule_due_idx ON publication_schedule(scheduled_for) WHERE status = 'pending';
CREATE INDEX publication_schedule_article_idx ON publication_schedule(article_id);

CREATE TABLE article_publication (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  revision_id   uuid NOT NULL REFERENCES article_revision(id) ON DELETE CASCADE,
  schedule_id   uuid REFERENCES publication_schedule(id) ON DELETE SET NULL,
  published_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  published_at  timestamptz NOT NULL DEFAULT now(),
  unpublished_by text REFERENCES "user"(id) ON DELETE SET NULL,
  unpublished_at timestamptz,
  unpublish_reason text,
  is_current    boolean NOT NULL DEFAULT true
);
CREATE INDEX article_publication_article_idx ON article_publication(article_id, published_at DESC);
CREATE UNIQUE INDEX article_publication_current_unique ON article_publication(article_id) WHERE is_current;

-- ===========================================================================
-- Public comments
-- ===========================================================================
CREATE TABLE public_comment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES public_comment(id) ON DELETE CASCADE,
  author_name     text NOT NULL,
  author_email    text,
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  ip_hash         text,
  report_count    integer NOT NULL DEFAULT 0,
  moderated_by    text REFERENCES "user"(id) ON DELETE SET NULL,
  moderated_at    timestamptz,
  moderation_note text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_comment_status_check CHECK (status IN ('pending','approved','rejected','hidden','spam'))
);
CREATE INDEX public_comment_article_idx ON public_comment(article_id, status, created_at DESC);
CREATE INDEX public_comment_status_idx ON public_comment(status, created_at DESC);

CREATE TABLE comment_moderation_action (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public_comment(id) ON DELETE CASCADE,
  actor_id   text REFERENCES "user"(id) ON DELETE SET NULL,
  action     text NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comment_moderation_comment_idx ON comment_moderation_action(comment_id, created_at DESC);

-- ===========================================================================
-- Notifications, audit, settings
-- ===========================================================================
CREATE TABLE notification (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  link       text,
  read_at    timestamptz,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX notification_dedupe_unique ON notification(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notification_user_idx ON notification(user_id, created_at DESC);

CREATE TABLE audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    text REFERENCES "user"(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  article_id  uuid REFERENCES article(id) ON DELETE SET NULL,
  revision_id uuid REFERENCES article_revision(id) ON DELETE SET NULL,
  from_status text,
  to_status   text,
  reason      text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_article_idx ON audit_log(article_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON audit_log(created_at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log(actor_id, created_at DESC);

CREATE TABLE site_setting (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Institutional content
-- ===========================================================================
CREATE TABLE event (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  title            text NOT NULL,
  summary          text NOT NULL DEFAULT '',
  description_html text NOT NULL DEFAULT '',
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz,
  timezone         text NOT NULL DEFAULT 'Africa/Monrovia',
  venue            text,
  organizer        text,
  registration_url text,
  is_published     boolean NOT NULL DEFAULT false,
  is_featured      boolean NOT NULL DEFAULT false,
  created_by       text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_starts_idx ON event(starts_at DESC);

CREATE TABLE faculty_profile (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  role               text NOT NULL,
  photo_id           uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  bio                text NOT NULL DEFAULT '',
  qualifications     text,
  teaching_interests text,
  research_interests text,
  email              text,
  phone              text,
  office             text,
  order_index        integer NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academic_page (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  kind        text NOT NULL DEFAULT 'program',
  summary     text NOT NULL DEFAULT '',
  body_html   text NOT NULL DEFAULT '',
  link_url    text,
  document_id uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  updated_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resource_download (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  description    text,
  file_id        uuid REFERENCES media_asset(id) ON DELETE SET NULL,
  category       text NOT NULL DEFAULT 'General',
  is_public      boolean NOT NULL DEFAULT true,
  download_count integer NOT NULL DEFAULT 0,
  uploaded_by    text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homepage_section (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  title        text NOT NULL,
  enabled      boolean NOT NULL DEFAULT true,
  order_index  integer NOT NULL DEFAULT 0,
  settings     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE announcement (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message    text NOT NULL,
  level      text NOT NULL DEFAULT 'info',
  link_label text,
  link_url   text,
  starts_at  timestamptz,
  ends_at    timestamptz,
  is_active  boolean NOT NULL DEFAULT true,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX announcement_active_idx ON announcement(is_active, starts_at, ends_at);

CREATE TABLE site_page (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  body_html   text NOT NULL DEFAULT '',
  section     text NOT NULL DEFAULT 'page',
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  updated_by  text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_subscriber (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL UNIQUE,
  status             text NOT NULL DEFAULT 'pending',
  confirm_token_hash text,
  ip_hash            text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  confirmed_at       timestamptz,
  unsubscribed_at    timestamptz,
  CONSTRAINT newsletter_status_check CHECK (status IN ('pending','confirmed','unsubscribed'))
);

CREATE TABLE redirect (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path   text NOT NULL UNIQUE,
  to_path     text NOT NULL,
  status_code integer NOT NULL DEFAULT 308,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Durable delivery: outbox + jobs
-- ===========================================================================
CREATE TABLE publication_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending',
  attempts        integer NOT NULL DEFAULT 0,
  available_at    timestamptz NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  last_error      text,
  idempotency_key text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_status_check CHECK (status IN ('pending','processing','done','failed'))
);
CREATE INDEX outbox_due_idx ON publication_outbox(available_at) WHERE status = 'pending';

CREATE TABLE job (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending',
  run_at          timestamptz NOT NULL DEFAULT now(),
  attempts        integer NOT NULL DEFAULT 0,
  max_attempts    integer NOT NULL DEFAULT 8,
  locked_at       timestamptz,
  locked_by       text,
  last_error      text,
  idempotency_key text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_status_check CHECK (status IN ('pending','processing','done','failed','cancelled'))
);
CREATE INDEX job_due_idx ON job(run_at) WHERE status = 'pending';

-- ===========================================================================
-- Analytics
-- ===========================================================================
CREATE TABLE analytics_session (
  id             text PRIMARY KEY,
  visitor_id     text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  page_views     integer NOT NULL DEFAULT 0,
  is_staff       boolean NOT NULL DEFAULT false,
  is_demo        boolean NOT NULL DEFAULT false,
  device         text,
  country        text,
  referrer_host  text,
  source         text,
  landing_path   text,
  duration_seconds integer NOT NULL DEFAULT 0
);
CREATE INDEX analytics_session_started_idx ON analytics_session(started_at DESC);
CREATE INDEX analytics_session_visitor_idx ON analytics_session(visitor_id, started_at);

CREATE TABLE analytics_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    text NOT NULL UNIQUE,
  session_id  text NOT NULL,
  visitor_id  text NOT NULL,
  type        text NOT NULL,
  path        text,
  article_id  uuid REFERENCES article(id) ON DELETE SET NULL,
  referrer    text,
  source      text,
  device      text,
  country     text,
  duration_ms integer,
  scroll_depth integer,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_staff    boolean NOT NULL DEFAULT false,
  is_demo     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_event_created_idx ON analytics_event(created_at DESC);
CREATE INDEX analytics_event_type_created_idx ON analytics_event(type, created_at DESC);
CREATE INDEX analytics_event_article_idx ON analytics_event(article_id, created_at DESC);
CREATE INDEX analytics_event_session_idx ON analytics_event(session_id);

CREATE TABLE analytics_search (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term         text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  path         text,
  is_demo      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_search_created_idx ON analytics_search(created_at DESC);

CREATE TABLE analytics_site_daily (
  day               date PRIMARY KEY,
  page_views        integer NOT NULL DEFAULT 0,
  unique_visitors   integer NOT NULL DEFAULT 0,
  sessions          integer NOT NULL DEFAULT 0,
  engaged_seconds   integer NOT NULL DEFAULT 0,
  shares            integer NOT NULL DEFAULT 0,
  downloads         integer NOT NULL DEFAULT 0,
  searches          integer NOT NULL DEFAULT 0,
  no_result_searches integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE analytics_article_daily (
  day             date NOT NULL,
  article_id      uuid NOT NULL REFERENCES article(id) ON DELETE CASCADE,
  views           integer NOT NULL DEFAULT 0,
  unique_visitors integer NOT NULL DEFAULT 0,
  engaged_seconds integer NOT NULL DEFAULT 0,
  scroll_50       integer NOT NULL DEFAULT 0,
  scroll_75       integer NOT NULL DEFAULT 0,
  scroll_100      integer NOT NULL DEFAULT 0,
  shares          integer NOT NULL DEFAULT 0,
  downloads       integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, article_id)
);

CREATE TABLE analytics_traffic_daily (
  day       date NOT NULL,
  dimension text NOT NULL,
  value     text NOT NULL,
  views     integer NOT NULL DEFAULT 0,
  uniques   integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, dimension, value)
);

CREATE TABLE analytics_ingest_guard (
  bucket     text PRIMARY KEY,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Immutability guards for audit trail
-- ===========================================================================
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Table % is append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER article_publication_no_delete BEFORE DELETE ON article_publication
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER comment_moderation_no_delete BEFORE DELETE ON comment_moderation_action
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
