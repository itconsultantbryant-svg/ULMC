export const ROLES = ["staff", "editor", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  staff: "Staff writer",
  editor: "Editor",
  admin: "Administrator",
  super_admin: "Super administrator",
};

export const PERMISSIONS = [
  "article.create",
  "article.editOwn",
  "article.submitOwn",
  "article.editAny",
  "article.preview",
  "article.publish",
  "article.schedule",
  "article.unpublish",
  "article.archive",
  "editorial.viewQueue",
  "editorial.assignSelf",
  "editorial.comment",
  "editorial.requestChanges",
  "editorial.approve",
  "admin.viewApprovalQueue",
  "admin.approve",
  "admin.return",
  "admin.reject",
  "comments.moderate",
  "comments.configure",
  "media.upload",
  "media.manageOwn",
  "media.manageAll",
  "analytics.viewOwn",
  "analytics.viewAll",
  "taxonomy.manage",
  "homepage.manage",
  "institutional.manage",
  "events.manage",
  "faculty.manage",
  "academics.manage",
  "users.view",
  "users.invite",
  "users.manage",
  "roles.manage",
  "settings.manage",
  "settings.security",
  "audit.view",
  "notifications.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const STAFF: Permission[] = [
  "article.create",
  "article.editOwn",
  "article.submitOwn",
  "article.preview",
  "analytics.viewOwn",
  "media.upload",
  "media.manageOwn",
];

const EDITOR: Permission[] = [
  ...STAFF,
  "article.editAny",
  "editorial.viewQueue",
  "editorial.assignSelf",
  "editorial.comment",
  "editorial.requestChanges",
  "editorial.approve",
  "comments.moderate",
  "taxonomy.manage",
  "analytics.viewOwn",
];

const ADMIN: Permission[] = [
  ...EDITOR,
  "article.publish",
  "article.schedule",
  "article.unpublish",
  "article.archive",
  "admin.viewApprovalQueue",
  "admin.approve",
  "admin.return",
  "admin.reject",
  "comments.configure",
  "media.manageAll",
  "analytics.viewAll",
  "homepage.manage",
  "institutional.manage",
  "events.manage",
  "faculty.manage",
  "academics.manage",
  "users.view",
  "users.invite",
  "users.manage",
  "settings.manage",
  "audit.view",
  "notifications.manage",
];

const SUPER_ADMIN: Permission[] = [
  ...ADMIN,
  "roles.manage",
  "settings.security",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  staff: STAFF,
  editor: EDITOR,
  admin: ADMIN,
  super_admin: SUPER_ADMIN,
};

const ROLE_RANK: Record<Role, number> = {
  staff: 1,
  editor: 2,
  admin: 3,
  super_admin: 4,
};

export function parseRoles(value: string | null | undefined): Role[] {
  if (!value) return [];
  const seen = new Set<Role>();
  for (const part of value.split(",")) {
    const role = part.trim() as Role;
    if (ROLES.includes(role)) seen.add(role);
  }
  return [...seen].sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a]);
}

export function primaryRole(value: string | null | undefined): Role {
  return parseRoles(value)[0] ?? "staff";
}

export function roleLabel(value: string | null | undefined): string {
  const roles = parseRoles(value);
  if (roles.length === 0) return "Staff writer";
  return roles.map((r) => ROLE_LABELS[r]).join(" · ");
}

export type Actor = { id: string; roles: Role[] };

export function can(
  actor: { id: string; roles: Role[] } | null | undefined,
  permission: Permission,
): boolean {
  if (!actor) return false;
  return actor.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export function canAny(actor: Actor | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(actor, p));
}

export function isPrivileged(actor: Actor | null | undefined): boolean {
  if (!actor) return false;
  return actor.roles.some((r) => r === "admin" || r === "super_admin");
}

export function requiresMfa(actor: Actor | null | undefined, enforced: boolean): boolean {
  return enforced && isPrivileged(actor);
}

// ---------------------------------------------------------------------------
// Editorial separation-of-duties rules (pure, unit tested)
// ---------------------------------------------------------------------------
export type SeparationInput = {
  actorId: string;
  authorIds: string[];
  editorId?: string | null;
};

export function canEditoriallyApprove(input: SeparationInput): boolean {
  return !input.authorIds.includes(input.actorId);
}

export function canFinallyApprove(input: SeparationInput): boolean {
  if (input.authorIds.includes(input.actorId)) return false;
  if (input.editorId && input.editorId === input.actorId) return false;
  return true;
}
