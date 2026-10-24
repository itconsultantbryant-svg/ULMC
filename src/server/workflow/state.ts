import type { Role } from "@/server/permissions";

export const WORKFLOW_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "changes_requested",
  "resubmitted",
  "editorially_approved",
  "admin_approved",
  "published",
  "scheduled",
  "rejected",
  "archived",
  "unpublished",
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  submitted: "Submitted for editorial review",
  in_review: "In editorial review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted",
  editorially_approved: "Editorially approved — pending admin approval",
  admin_approved: "Admin approved — ready to publish",
  published: "Published",
  scheduled: "Scheduled",
  rejected: "Rejected",
  archived: "Archived",
  unpublished: "Unpublished",
};

export const STATUS_DESCRIPTIONS: Record<WorkflowStatus, string> = {
  draft: "Visible only to you and editors. Not submitted for review.",
  submitted: "Waiting for an editor to begin review.",
  in_review: "An editor is reviewing sources, images, captions and quality.",
  changes_requested: "The editor returned the story with required changes.",
  resubmitted: "Revised story waiting for the editor to resume review.",
  editorially_approved: "Editorial review complete. Requires a different administrator's approval.",
  admin_approved: "Final approval recorded for this exact revision. Publish or schedule it.",
  published: "The approved revision is live. Later edits create a replacement draft.",
  scheduled: "Approved and queued for durable publication at the scheduled time.",
  rejected: "The story will not be published in its current form.",
  archived: "Removed from active queues. History is preserved.",
  unpublished: "Removed from public view with a recorded reason.",
};

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, string> = {
  draft: "slate",
  submitted: "blue",
  in_review: "amber",
  changes_requested: "orange",
  resubmitted: "blue",
  editorially_approved: "violet",
  admin_approved: "teal",
  published: "green",
  scheduled: "cyan",
  rejected: "red",
  archived: "slate",
  unpublished: "red",
};

export const EDITORIAL_CHECKLIST_KEYS = [
  "sources_verified",
  "image_rights",
  "captions_credit",
  "accessibility",
  "quality",
] as const;

export type EditorialChecklistKey = (typeof EDITORIAL_CHECKLIST_KEYS)[number];

export const EDITORIAL_CHECKLIST_LABELS: Record<EditorialChecklistKey, string> = {
  sources_verified: "Facts, quotes and sources verified",
  image_rights: "Image rights and usage permissions confirmed",
  captions_credit: "Captions, credits and alt text are accurate",
  accessibility: "Headings, links and embeds are accessible",
  quality: "Structure, clarity and headline meet editorial standards",
};

export type TransitionRule = {
  from: WorkflowStatus;
  to: WorkflowStatus;
  allowedRoles: Role[];
  requiresReason?: boolean;
  requiresComment?: boolean;
  description: string;
};

/**
 * Declarative transition table. Authorization *and* workflow invariants are
 * enforced again in the service layer; this table is the single documented
 * source of truth for which edges exist.
 */
export const TRANSITIONS: TransitionRule[] = [
  { from: "draft", to: "submitted", allowedRoles: ["staff", "editor", "admin", "super_admin"], description: "Submit for editorial review" },
  { from: "draft", to: "archived", allowedRoles: ["staff", "editor", "admin", "super_admin"], description: "Archive draft" },
  { from: "submitted", to: "in_review", allowedRoles: ["editor", "admin", "super_admin"], description: "Begin editorial review" },
  { from: "submitted", to: "rejected", allowedRoles: ["editor", "admin", "super_admin"], requiresReason: true, description: "Reject submission" },
  { from: "submitted", to: "archived", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Archive submission" },
  { from: "in_review", to: "changes_requested", allowedRoles: ["editor", "admin", "super_admin"], requiresReason: true, description: "Request changes" },
  { from: "in_review", to: "editorially_approved", allowedRoles: ["editor", "admin", "super_admin"], description: "Approve editorial review and send to administrator" },
  { from: "in_review", to: "rejected", allowedRoles: ["editor", "admin", "super_admin"], requiresReason: true, description: "Reject during review" },
  { from: "changes_requested", to: "resubmitted", allowedRoles: ["staff", "editor", "admin", "super_admin"], description: "Resubmit revised story" },
  { from: "changes_requested", to: "archived", allowedRoles: ["staff", "editor", "admin", "super_admin"], description: "Archive returned story" },
  { from: "resubmitted", to: "in_review", allowedRoles: ["editor", "admin", "super_admin"], description: "Resume editorial review" },
  { from: "resubmitted", to: "changes_requested", allowedRoles: ["editor", "admin", "super_admin"], requiresReason: true, description: "Request further changes" },
  { from: "resubmitted", to: "rejected", allowedRoles: ["editor", "admin", "super_admin"], requiresReason: true, description: "Reject resubmission" },
  { from: "editorially_approved", to: "admin_approved", allowedRoles: ["admin", "super_admin"], description: "Final administrative approval" },
  { from: "editorially_approved", to: "in_review", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Return to editor" },
  { from: "editorially_approved", to: "rejected", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Reject at final review" },
  { from: "admin_approved", to: "published", allowedRoles: ["admin", "super_admin"], description: "Publish immediately" },
  { from: "admin_approved", to: "scheduled", allowedRoles: ["admin", "super_admin"], description: "Schedule publication" },
  { from: "scheduled", to: "admin_approved", allowedRoles: ["admin", "super_admin"], description: "Cancel schedule" },
  { from: "published", to: "unpublished", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Unpublish" },
  { from: "published", to: "archived", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Unpublish and archive" },
  { from: "unpublished", to: "published", allowedRoles: ["admin", "super_admin"], description: "Republish approved revision" },
  { from: "unpublished", to: "archived", allowedRoles: ["admin", "super_admin"], description: "Archive unpublished story" },
  { from: "admin_approved", to: "archived", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Archive approved story" },
  { from: "editorially_approved", to: "archived", allowedRoles: ["admin", "super_admin"], requiresReason: true, description: "Archive without publishing" },
  { from: "rejected", to: "archived", allowedRoles: ["admin", "super_admin"], description: "Archive rejected story" },
];

const transitionIndex = new Map<string, TransitionRule>();
for (const rule of TRANSITIONS) transitionIndex.set(`${rule.from}->${rule.to}`, rule);

export function getTransition(from: WorkflowStatus, to: WorkflowStatus): TransitionRule | null {
  return transitionIndex.get(`${from}->${to}`) ?? null;
}

export function isTransitionAllowed(
  from: WorkflowStatus,
  to: WorkflowStatus,
  roles: Role[],
): boolean {
  const rule = getTransition(from, to);
  if (!rule) return false;
  return roles.some((role) => rule.allowedRoles.includes(role));
}

export function allowedTransitions(from: WorkflowStatus, roles: Role[]): WorkflowStatus[] {
  return TRANSITIONS.filter(
    (rule) => rule.from === from && roles.some((role) => rule.allowedRoles.includes(role)),
  ).map((rule) => rule.to);
}

export const DRAFT_STATUSES: WorkflowStatus[] = ["draft", "changes_requested"];
export const EDITABLE_STATUSES: WorkflowStatus[] = ["draft", "changes_requested"];
export const QUEUE_STATUSES: WorkflowStatus[] = ["submitted", "in_review", "resubmitted"];
export const ADMIN_QUEUE_STATUSES: WorkflowStatus[] = ["editorially_approved"];

export function isPubliclyVisible(article: {
  publishedRevisionId: string | null;
  unpublishedAt?: Date | null;
}): boolean {
  return Boolean(article.publishedRevisionId) && !article.unpublishedAt;
}

export function isEditable(status: WorkflowStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function isScheduled(status: WorkflowStatus): boolean {
  return status === "scheduled";
}

export function checklistComplete(checklist: unknown): boolean {
  if (!checklist || typeof checklist !== "object") return false;
  const record = checklist as Record<string, unknown>;
  return EDITORIAL_CHECKLIST_KEYS.every((key) => record[key] === true);
}
