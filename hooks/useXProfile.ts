"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { XFeedSchema, type XFeed, type FeedIssue } from "../utils/x-profile";

const ISSUES = new Set<FeedIssue>([
  "not_configured",
  "unavailable",
  "rate_limited",
  "timeout",
  "invalid_cursor",
]);
export default function useXProfile(enabled: boolean) {
  const [feed, setFeed] = useState<XFeed | null>(null);
  const [issue, setIssue] = useState<FeedIssue | null>(null);
  const [busy, setBusy] = useState<"initial" | "more" | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const feedRef = useRef<XFeed | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const load = useCallback(async (more = false) => {
    if (!enabledRef.current || (more && requestRef.current)) return;
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      setIssue("static_export");
      return;
    }
    const previous = feedRef.current;
    const cursor = more ? previous?.nextCursor : undefined;
    if (more && !cursor) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIssue(null);
    setBusy(more ? "more" : "initial");
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 28000);
    controller.signal.addEventListener("abort", () => clearTimeout(timer), {
      once: true,
    });
    try {
      const response = await fetch(
        `/api/x/profile${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        { signal: controller.signal, credentials: "same-origin" },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        const code =
          body && typeof body === "object" && "code" in body
            ? (body.code as FeedIssue)
            : "unavailable";
        throw new Error(ISSUES.has(code) ? code : "unavailable");
      }
      const parsed = XFeedSchema.safeParse(body);
      if (!parsed.success) throw new Error("unavailable");
      if (
        requestRef.current !== controller ||
        controller.signal.aborted ||
        !enabledRef.current
      )
        return;
      const value = parsed.data;
      const unique = new Set<string>();
      value.posts = value.posts.filter((post) => {
        if (unique.has(post.id)) return false;
        unique.add(post.id);
        return true;
      });
      if (more && previous) {
        const known = new Set(previous.posts.map((post) => post.id));
        value.posts = [
          ...previous.posts,
          ...value.posts.filter((post) => !known.has(post.id)),
        ].slice(0, 100);
        if (value.nextCursor === cursor || value.posts.length >= 100)
          value.nextCursor = undefined;
      }
      feedRef.current = value;
      setFeed(value);
    } catch (error) {
      if (
        requestRef.current !== controller ||
        !enabledRef.current ||
        (controller.signal.aborted && !timedOut)
      )
        return;
      const code =
        error instanceof Error ? (error.message as FeedIssue) : "unavailable";
      setIssue(timedOut ? "timeout" : ISSUES.has(code) ? code : "unavailable");
      if (!more) {
        feedRef.current = null;
        setFeed(null);
      }
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(null);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
    else {
      requestRef.current?.abort();
      requestRef.current = null;
      feedRef.current = null;
      setFeed(null);
      setIssue(null);
      setBusy(null);
    }
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [enabled, load]);
  return {
    feed,
    issue,
    busy,
    refresh: () => load(),
    loadMore: () => load(true),
  };
}
