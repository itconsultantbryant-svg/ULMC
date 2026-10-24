import { errorResponse } from "@/server/http";
import { requireApiPermission } from "@/server/session";
import { getLiveSnapshot } from "@/server/analytics/queries";
import { subscribeToAnalytics } from "@/server/analytics/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireApiPermission("analytics.viewAll");
  } catch (error) {
    return errorResponse(error);
  }

  const encoder = new TextEncoder();
  let closed = false;
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let poll: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const snapshot = await getLiveSnapshot();
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`),
          );
        } catch (error) {
          console.error("Live snapshot failed", error);
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (poll) clearInterval(poll);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      await send();
      unsubscribe = await subscribeToAnalytics(() => {
        void send();
      });
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, 15_000);
      poll = setInterval(() => {
        void send();
      }, 10_000);
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (poll) clearInterval(poll);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
