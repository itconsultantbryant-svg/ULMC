export const CONTENT_TYPE_LABELS_UI: Record<string, string> = {
  news: "Department news",
  campus: "Campus news",
  education: "Education",
  community: "Community reporting",
  media_society: "Media and society",
  research: "Research",
  feature: "Feature",
  opinion: "Opinion and analysis",
  student: "Student journalism",
  announcement: "Announcement",
  sponsored: "Sponsored",
};

export const STATUS_LABELS_UI: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted for editorial review",
  in_review: "In editorial review",
  changes_requested: "Changes requested",
  resubmitted: "Resubmitted",
  editorially_approved: "Editorially approved — pending admin",
  admin_approved: "Admin approved",
  published: "Published",
  scheduled: "Scheduled",
  rejected: "Rejected",
  archived: "Archived",
  unpublished: "Unpublished",
};

const typeClasses: Record<string, string> = {
  opinion: "badge-opinion",
  sponsored: "badge-sponsored",
  student: "badge-student",
  announcement: "badge-announcement",
  news: "badge-news",
};

export function ContentTypeBadge({ type, label }: { type: string; label?: string }) {
  if (type === "news") return null;
  return (
    <span className={`badge ${typeClasses[type] ?? "badge-announcement"}`}>
      {label ?? CONTENT_TYPE_LABELS_UI[type] ?? type}
    </span>
  );
}

export function ContentTypeLabel({ type }: { type: string }) {
  return <>{CONTENT_TYPE_LABELS_UI[type] ?? type}</>;
}

const statusClasses: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-50 text-blue-800",
  in_review: "bg-amber-50 text-amber-800",
  changes_requested: "bg-orange-50 text-orange-800",
  resubmitted: "bg-blue-50 text-blue-800",
  editorially_approved: "bg-violet-50 text-violet-800",
  admin_approved: "bg-teal-50 text-teal-800",
  published: "bg-green-50 text-green-800",
  scheduled: "bg-cyan-50 text-cyan-800",
  rejected: "bg-red-50 text-red-800",
  archived: "bg-slate-100 text-slate-600",
  unpublished: "bg-red-50 text-red-700",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`badge ${statusClasses[status] ?? "bg-slate-100 text-slate-700"}`}
      title={label ?? STATUS_LABELS_UI[status] ?? status}
    >
      {label ?? STATUS_LABELS_UI[status] ?? status}
    </span>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "red" | "green" | "amber" | "blue" | "violet" | "slate";
}) {
  const tones = {
    neutral: "bg-mist text-ink border-line",
    red: "bg-red-tint text-red-deep border-red/20",
    green: "bg-success-tint text-success border-success/20",
    amber: "bg-warn-tint text-warn border-warn/20",
    blue: "bg-info-tint text-info border-info/20",
    violet: "bg-violet-50 text-violet-800 border-violet-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
