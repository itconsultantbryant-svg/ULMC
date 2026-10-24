import { ZodError } from "zod";
import { WorkflowError } from "@/server/workflow/errors";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json(
      { error: error.message, details: error.details ?? undefined },
      { status: error.status },
    );
  }
  if (error instanceof WorkflowError) {
    return Response.json(
      { error: error.message, code: error.code, details: error.details ?? undefined },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Please check the highlighted fields.", details: error.flatten() },
      { status: 400 },
    );
  }
  console.error("Unhandled API error", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new HttpError(415, "Expected a JSON request body.");
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 1_000_000) throw new HttpError(413, "Request body is too large.");
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "The request body is not valid JSON.");
  }
}
