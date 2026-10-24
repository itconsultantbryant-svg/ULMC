"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type EventType = "pageview" | "engagement" | "scroll" | "share" | "download" | "search";

type Payload = {
  eventId: string;
  sessionId: string;
  visitorId: string;
  type: EventType;
  path: string;
  referrer?: string;
  articleSlug?: string;
  durationMs?: number;
  scrollDepth?: number;
  searchTerm?: string;
  resultCount?: number;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getVisitorId(): string {
  try {
    const key = "ulmc.visitor";
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const id = uuid();
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return uuid();
  }
}

function getSessionId(): string {
  try {
    const key = "ulmc.session";
    const existing = window.sessionStorage.getItem(key);
    if (existing && existing.length >= 8) return existing;
    const id = uuid();
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return uuid();
  }
}

function doNotTrack(): boolean {
  const dnt =
    navigator.doNotTrack === "1" ||
    (window as unknown as { doNotTrack?: string }).doNotTrack === "1" ||
    (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
  return dnt;
}

const SKIP = ["/studio", "/preview", "/setup"];

export function AnalyticsTracker() {
  const pathname = usePathname();
  const sessionRef = useRef<{ sessionId: string; visitorId: string } | null>(null);
  const scrollSent = useRef<Set<string>>(new Set());
  const startRef = useRef<number>(Date.now());

  function send(payload: Payload, beacon = false) {
    const body = JSON.stringify(payload);
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/collect", blob);
      return;
    }
    void fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function ensureIds() {
    if (!sessionRef.current) {
      sessionRef.current = { sessionId: getSessionId(), visitorId: getVisitorId() };
    }
    return sessionRef.current;
  }

  useEffect(() => {
    if (doNotTrack()) return;
    if (SKIP.some((prefix) => pathname.startsWith(prefix))) return;
    const ids = ensureIds();
    const match = /^\/news\/([^/]+)$/.exec(pathname);
    const articleSlug =
      match?.[1] && !["category", "tag"].includes(match[1]) ? match[1] : undefined;

    startRef.current = Date.now();
    scrollSent.current = new Set();

    send({
      eventId: uuid(),
      ...ids,
      type: "pageview",
      path: pathname,
      referrer: document.referrer,
      articleSlug: articleSlug ? decodeURIComponent(String(articleSlug)) : undefined,
    });

    if (pathname === "/search") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        send({
          eventId: uuid(),
          ...ids,
          type: "search",
          path: pathname,
          searchTerm: q,
        });
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (doNotTrack()) return;
    if (SKIP.some((prefix) => pathname.startsWith(prefix))) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const depth = Math.min(100, Math.round((window.scrollY / max) * 100));
      const ids = ensureIds();
      for (const milestone of [50, 75, 100]) {
        if (depth >= milestone && !scrollSent.current.has(`${pathname}:${milestone}`)) {
          scrollSent.current.add(`${pathname}:${milestone}`);
          send({
            eventId: uuid(),
            ...ids,
            type: "scroll",
            path: pathname,
            scrollDepth: milestone,
          });
        }
      }
    };

    const sendEngagement = (beacon: boolean) => {
      if (SKIP.some((prefix) => pathname.startsWith(prefix))) return;
      const ids = ensureIds();
      const elapsed = Date.now() - startRef.current;
      if (elapsed < 1000) return;
      send(
        {
          eventId: uuid(),
          ...ids,
          type: "engagement",
          path: pathname,
          durationMs: Math.min(elapsed, 30 * 60_000),
        },
        beacon,
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") sendEngagement(true);
    };
    const onPageHide = () => sendEngagement(true);

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";
      const isDownload =
        href.includes("?download=1") || target.hasAttribute("download") || href.endsWith(".pdf");
      if (!isDownload) return;
      const ids = ensureIds();
      send({
        eventId: uuid(),
        ...ids,
        type: "download",
        path: pathname,
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);
    const interval = window.setInterval(() => sendEngagement(false), 30_000);

    return () => {
      sendEngagement(false);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
      window.clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
