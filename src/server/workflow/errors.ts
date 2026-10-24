export type WorkflowErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "invalid_transition"
  | "separation_of_duties"
  | "missing_approval"
  | "approval_stale"
  | "locked";

export class WorkflowError extends Error {
  code: WorkflowErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(code: WorkflowErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
    this.status = statusFor(code);
    this.details = details;
  }
}

function statusFor(code: WorkflowErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
    case "approval_stale":
      return 409;
    case "invalid_transition":
    case "separation_of_duties":
    case "missing_approval":
      return 422;
    case "validation":
      return 400;
    case "locked":
      return 423;
    default:
      return 400;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof WorkflowError) {
    return {
      status: error.status,
      body: { ok: false, error: { code: error.code, message: error.message, details: error.details } },
    };
  }
  console.error("[workflow] unexpected error", error);
  return {
    status: 500,
    body: { ok: false, error: { code: "internal", message: "Something went wrong. Please try again." } },
  };
}
