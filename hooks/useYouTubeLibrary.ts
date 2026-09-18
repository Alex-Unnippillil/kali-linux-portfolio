"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchYouTubeChannelSummary,
  fetchYouTubePlaylistDirectoryByChannelId,
  fetchYouTubePlaylistItems,
  type YouTubeChannelSummary,
  type YouTubePlaylistDirectory,
} from "../utils/youtube";
import {
  mapConcurrent,
  mergeUniqueVideos,
  nextPlaylistCursor,
  type PlaylistItemsState,
} from "../utils/youtube-library";

// Server API routes are preferred. Retain the existing restricted-key fallback for static exports.
const CLIENT_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? "";
type DirectoryPayload = {
  summary: YouTubeChannelSummary | null;
  directory: YouTubePlaylistDirectory;
};
type PagePayload = Awaited<ReturnType<typeof fetchYouTubePlaylistItems>>;
const emptyPage = (): PlaylistItemsState => ({
  items: [],
  loading: false,
  loaded: false,
});
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "YouTube could not be reached. Please try again.";

async function readResponse<T>(url: string, signal: AbortSignal): Promise<T> {
  const request = new AbortController();
  let timedOut = false;
  const abort = () => request.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) request.abort();
  const timer = setTimeout(() => {
    timedOut = true;
    request.abort();
  }, 20000);
  try {
    const response = await fetch(url, { signal: request.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        typeof payload?.error === "string"
          ? payload.error
          : payload?.error?.message;
      throw new Error(
        detail ||
          `YouTube request failed (${response.status}). Please try again.`,
      );
    }
    if (!payload)
      throw new Error(
        "YouTube returned an unreadable response. Please try again.",
      );
    return payload as T;
  } catch (error) {
    if (timedOut && !signal.aborted)
      throw new Error("YouTube took too long to respond. Please retry.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export default function useYouTubeLibrary(
  channelId: string,
  allowNetwork: boolean,
) {
  const [directory, setDirectory] = useState<YouTubePlaylistDirectory | null>(
    null,
  );
  const [summary, setSummary] = useState<YouTubeChannelSummary | null>(null);
  const [pages, setPages] = useState<Record<string, PlaylistItemsState>>({});
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const pageCache = useRef<Record<string, PlaylistItemsState>>({});
  const controllers = useRef(new Map<string, AbortController>());
  const allRequest = useRef(false);

  useEffect(() => {
    const epoch = ++generation.current;
    const controller = new AbortController();
    const requests = controllers.current;
    requests.forEach((request) => request.abort());
    requests.clear();
    allRequest.current = false;
    pageCache.current = {};
    setPages({});
    setDirectory(null);
    setSummary(null);
    setDirectoryError(null);
    setLoadingAll(false);
    setLoadingDirectory(allowNetwork);

    if (allowNetwork) {
      void (async () => {
        try {
          let payload: DirectoryPayload;
          try {
            payload = await readResponse<DirectoryPayload>(
              `/api/youtube/directory?channelId=${encodeURIComponent(channelId)}`,
              controller.signal,
            );
          } catch (error) {
            if (controller.signal.aborted || !CLIENT_KEY) throw error;
            const [channel, listings] = await Promise.all([
              fetchYouTubeChannelSummary(
                channelId,
                CLIENT_KEY,
                controller.signal,
              ),
              fetchYouTubePlaylistDirectoryByChannelId(
                channelId,
                CLIENT_KEY,
                controller.signal,
              ),
            ]);
            payload = { summary: channel, directory: listings };
          }
          if (!Array.isArray(payload.directory?.playlists))
            throw new Error(
              "The playlist directory is unavailable. Please refresh.",
            );
          if (controller.signal.aborted || generation.current !== epoch) return;
          setSummary(payload.summary);
          setDirectory({
            ...payload.directory,
            sections: payload.directory.sections ?? [],
          });
        } catch (error) {
          if (!controller.signal.aborted && generation.current === epoch)
            setDirectoryError(errorText(error));
        } finally {
          if (!controller.signal.aborted && generation.current === epoch)
            setLoadingDirectory(false);
        }
      })();
    }
    return () => {
      generation.current = epoch + 1;
      controller.abort();
      requests.forEach((request) => request.abort());
      requests.clear();
    };
  }, [channelId, allowNetwork, revision]);

  const loadPage = useCallback(
    async (playlistId: string, append = false) => {
      if (!allowNetwork) return;
      const previous = pageCache.current[playlistId] ?? emptyPage();
      if (
        previous.loading ||
        (previous.loaded && (!append || !previous.nextPageToken))
      )
        return;
      const epoch = generation.current;
      const controller = new AbortController();
      const requests = controllers.current;
      requests.set(playlistId, controller);
      const publish = (value: PlaylistItemsState) => {
        if (generation.current !== epoch || controller.signal.aborted) return;
        pageCache.current = { ...pageCache.current, [playlistId]: value };
        setPages(pageCache.current);
      };
      publish({ ...previous, loading: true, error: undefined });
      const pageToken = append ? previous.nextPageToken : undefined;
      try {
        let payload: PagePayload;
        try {
          const query = new URLSearchParams({ playlistId, maxResults: "50" });
          if (pageToken) query.set("pageToken", pageToken);
          payload = await readResponse<PagePayload>(
            `/api/youtube/playlist-items?${query}`,
            controller.signal,
          );
        } catch (error) {
          if (controller.signal.aborted || !CLIENT_KEY) throw error;
          payload = await fetchYouTubePlaylistItems(playlistId, CLIENT_KEY, {
            pageToken,
            maxResults: 50,
            signal: controller.signal,
          });
        }
        if (!Array.isArray(payload.items))
          throw new Error(
            "The playlist response is unavailable. Please retry.",
          );
        publish({
          items: mergeUniqueVideos(append ? previous.items : [], payload.items),
          nextPageToken: nextPlaylistCursor(payload.nextPageToken, pageToken),
          loading: false,
          loaded: true,
        });
      } catch (error) {
        publish({ ...previous, loading: false, error: errorText(error) });
      } finally {
        if (requests.get(playlistId) === controller)
          requests.delete(playlistId);
      }
    },
    [allowNetwork],
  );

  const loadAll = useCallback(
    async (append = false) => {
      if (!directory || !allowNetwork || allRequest.current) return;
      const epoch = generation.current;
      allRequest.current = true;
      setLoadingAll(true);
      try {
        const ids = Array.from(
          new Set(directory.playlists.map((playlist) => playlist.id)),
        );
        await mapConcurrent(ids, async (id) => {
          if (generation.current === epoch) await loadPage(id, append);
        });
      } finally {
        if (generation.current === epoch) {
          allRequest.current = false;
          setLoadingAll(false);
        }
      }
    },
    [directory, allowNetwork, loadPage],
  );

  const retryErrors = useCallback(async () => {
    const epoch = generation.current;
    const failed = Object.entries(pageCache.current).filter(
      ([, page]) => page.error,
    );
    await mapConcurrent(failed, async ([id, page]) => {
      if (generation.current === epoch)
        await loadPage(id, Boolean(page.loaded));
    });
  }, [loadPage]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return {
    directory,
    summary,
    pages,
    loadingDirectory,
    directoryError,
    loadingAll,
    loadPage,
    loadAll,
    retryErrors,
    refresh,
  };
}
