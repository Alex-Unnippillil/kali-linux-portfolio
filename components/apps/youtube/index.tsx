"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import EmbedFrame from "../../EmbedFrame";
import useWatchLater from "../../../apps/youtube/state/watchLater";
import useYouTubeLibrary from "../../../hooks/useYouTubeLibrary";
import {
  parseYouTubeChannelId,
  type YouTubePlaylistVideo,
} from "../../../utils/youtube";
import {
  ALL_PLAYLIST_ID,
  filterDirectoryBySearch,
  filterPlaylistVideos,
  mergeUniqueVideos,
  sortPlaylistVideos,
  firstAvailableVideo,
  type VideoSortMode,
} from "../../../utils/youtube-library";
import { scrollWithinContainer } from "../../../utils/scrollWithinContainer";
import VideoIcon from "./VideoIcon";
import styles from "./youtube.module.css";

export {
  filterDirectoryBySearch,
  filterPlaylistVideos,
  sortPlaylistVideos,
} from "../../../utils/youtube-library";
export type {
  PlaylistListing,
  PlaylistItemsState,
} from "../../../utils/youtube-library";
const DEFAULT_CHANNEL_ID = "UCxPIJ3hw6AOwomUWh5B7SfQ";
const watchUrl = (id: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
};

export default function YouTubeApp({ channelId }: { channelId?: string }) {
  const channel =
    parseYouTubeChannelId(channelId ?? "") ??
    parseYouTubeChannelId(process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? "") ??
    DEFAULT_CHANNEL_ID;
  return <CuratedYouTube key={channel} channel={channel} />;
}

function CuratedYouTube({ channel }: { channel: string }) {
  const {
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
  } = useYouTubeLibrary(channel);
  const [saved, setSaved] = useWatchLater();
  const [selection, setSelection] = useState<{
    channel: string;
    video: YouTubePlaylistVideo;
  } | null>(null);
  const [playlistId, setPlaylistId] = useState(ALL_PLAYLIST_ID);
  const [category, setCategory] = useState("all");
  const [showSaved, setShowSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VideoSortMode>("playlist");
  const [expanded, setExpanded] = useState(false);
  const [theatre, setTheatre] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const videosRef = useRef<HTMLElement>(null);
  const collectionsRef = useRef<HTMLElement>(null);
  const userSelected = useRef(false);
  const id = useId();
  const playlists = useMemo(() => directory?.playlists ?? [], [directory]);
  const playing = selection?.channel === channel ? selection.video : null;

  useEffect(() => {
    setSelection(null);
    setPlaylistId(ALL_PLAYLIST_ID);
    setCategory("all");
    setQuery("");
  }, [channel]);
  useEffect(() => {
    if (!directory || loadingAll) return;
    const missing = directory.playlists.some(
      ({ id: key }) =>
        !pages[key] ||
        (!pages[key].loaded && !pages[key].loading && !pages[key].error),
    );
    if (missing) void loadAll();
  }, [directory, pages, loadingAll, loadAll]);
  useEffect(() => {
    if (playing) return;
    const first = firstAvailableVideo(playlists, pages);
    if (first) setSelection({ channel, video: first });
  }, [playing, playlists, pages, channel]);
  useEffect(() => {
    setExpanded(false);
    // Automatic selection must never steal keyboard focus or scroll the desktop.
    if (!userSelected.current) return;
    userSelected.current = false;
    scrollWithinContainer(mainRef.current, playerRef.current);
    headingRef.current?.focus({ preventScroll: true });
  }, [playing]);
  useEffect(() => {
    if (
      directory &&
      playlistId !== ALL_PLAYLIST_ID &&
      !playlists.some(({ id: key }) => key === playlistId)
    )
      setPlaylistId(ALL_PLAYLIST_ID);
  }, [directory, playlists, playlistId]);

  const sections = useMemo(() => {
    const seen = new Set<string>();
    // Channel sections define categories; synthetic catch-all sections are represented by All collections.
    return (directory?.sections ?? []).filter((section) => {
      const ids = Array.from(
        new Set(section.playlists.map((playlist) => playlist.id)),
      )
        .sort()
        .join("|");
      if (
        !ids ||
        seen.has(ids) ||
        section.playlists.length === playlists.length
      )
        return false;
      seen.add(ids);
      return true;
    });
  }, [directory, playlists.length]);
  const categoryPlaylists =
    category === "all"
      ? playlists
      : (sections.find((section) => section.sectionId === category)
          ?.playlists ?? playlists);
  const visiblePlaylists = useMemo(
    () =>
      filterDirectoryBySearch(
        [
          {
            sectionId: "visible",
            sectionTitle: "Collections",
            playlists: categoryPlaylists,
          },
        ],
        query,
        pages,
      )[0]?.playlists ?? [],
    [categoryPlaylists, query, pages],
  );
  const allVideos = useMemo(
    () =>
      mergeUniqueVideos(
        ...playlists.map((playlist) => pages[playlist.id]?.items ?? []),
      ),
    [playlists, pages],
  );
  const savedVideos = useMemo(
    () =>
      saved
        .filter((video) => video.channelId === channel)
        .map(
          (video, position) =>
            allVideos.find((item) => item.videoId === video.id) ?? {
              videoId: video.id,
              title: video.title,
              thumbnail: video.thumbnail,
              description: "",
              publishedAt: "",
              position,
            },
        ),
    [saved, channel, allVideos],
  );
  const activePlaylist = playlists.find(
    (playlist) => playlist.id === playlistId,
  );
  const sourceVideos = useMemo(
    () =>
      showSaved
        ? savedVideos
        : activePlaylist
          ? (pages[activePlaylist.id]?.items ?? [])
          : mergeUniqueVideos(
              ...categoryPlaylists.map(
                (playlist) => pages[playlist.id]?.items ?? [],
              ),
            ),
    [showSaved, savedVideos, activePlaylist, pages, categoryPlaylists],
  );
  const sorted = useMemo(
    () =>
      sort === "playlist" && !activePlaylist
        ? sourceVideos
        : sortPlaylistVideos(sourceVideos, sort),
    [sourceVideos, sort, activePlaylist],
  );
  const videos = useMemo(
    () => filterPlaylistVideos(sorted, query),
    [sorted, query],
  );
  const savedIds = useMemo(
    () => new Set(saved.map((video) => video.id)),
    [saved],
  );
  const relevantIds = activePlaylist
    ? [activePlaylist.id]
    : categoryPlaylists.map((playlist) => playlist.id);
  const busy =
    loadingDirectory ||
    loadingAll ||
    relevantIds.some((key) => pages[key]?.loading);
  const hasMore =
    !showSaved && relevantIds.some((key) => Boolean(pages[key]?.nextPageToken));
  const hasErrors = relevantIds.some((key) => Boolean(pages[key]?.error));
  const currentIndex = playing
    ? sorted.findIndex((video) => video.videoId === playing.videoId)
    : -1;
  const queue =
    currentIndex >= 0
      ? sorted.slice(currentIndex + 1, currentIndex + 5)
      : sorted.slice(0, 4);
  const title = showSaved
    ? "Watch later"
    : (activePlaylist?.title ?? "Explore the videos");

  const watch = (video: YouTubePlaylistVideo) => {
    userSelected.current = true;
    if (video.videoId === playing?.videoId) {
      userSelected.current = false;
      scrollWithinContainer(mainRef.current, playerRef.current);
      headingRef.current?.focus({ preventScroll: true });
    } else setSelection({ channel, video });
  };
  const choosePlaylist = (next: string) => {
    setPlaylistId(next);
    setShowSaved(false);
    setQuery("");
    // Browsing a collection is independent of the persistent player.
    if (next !== ALL_PLAYLIST_ID && !pages[next]?.loaded && !pages[next]?.error)
      void loadPage(next);
  };
  const toggleSaved = (video: YouTubePlaylistVideo) => {
    const removing = savedIds.has(video.videoId);
    setSaved((previous) =>
      removing
        ? previous.filter((item) => item.id !== video.videoId)
        : [
            ...previous.filter((item) => item.id !== video.videoId),
            {
              id: video.videoId,
              title: video.title,
              thumbnail: video.thumbnail,
              channelName: summary?.title ?? "Alex Unnippillil",
              channelId: channel,
            },
          ],
    );
    setAnnouncement(
      removing
        ? "Removed from Watch later on this browser."
        : "Saved to Watch later on this browser.",
    );
  };
  const share = async () => {
    if (!playing) return;
    try {
      if (window.navigator.share)
        await window.navigator.share({
          title: playing.title,
          url: watchUrl(playing.videoId),
        });
      else if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(watchUrl(playing.videoId));
        setAnnouncement("Video link copied.");
      } else setAnnouncement("Use Open on YouTube to copy this video’s link.");
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        setAnnouncement("Sharing is unavailable. Use Open on YouTube instead.");
    }
  };
  const thumbnail = (src: string, alt = "") =>
    src ? (
      <img
        src={src}
        alt={alt}
        width="480"
        height="270"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
    ) : null;

  return (
    <div
      ref={rootRef}
      className={styles.container}
      data-testid="youtube-app"
      onKeyDown={(event) => {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          (event.target as HTMLElement).closest(
            'input, textarea, select, [contenteditable="true"]',
          )
        )
          return;
        if (event.key === "/") {
          event.preventDefault();
          event.stopPropagation();
          searchRef.current?.focus();
        }
      }}
    >
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          aria-label="YouTube library home"
          onClick={() => {
            choosePlaylist(ALL_PLAYLIST_ID);
            setCategory("all");
          }}
        >
          <span className={styles.logo}>
            <VideoIcon name="play" />
          </span>
          <span>
            YouTube <small>CURATED</small>
          </span>
        </button>
        <form
          className={styles.search}
          role="search"
          aria-label="YouTube library search"
          onSubmit={(event) => {
            event.preventDefault();
            scrollWithinContainer(mainRef.current, videosRef.current);
          }}
        >
          <VideoIcon name="search" />
          <label className={styles.srOnly} htmlFor={`${id}-search`}>
            Search playlists or loaded videos
          </label>
          <input
            ref={searchRef}
            id={`${id}-search`}
            aria-label="Search playlists or loaded videos"
            type="search"
            placeholder="Search the collection"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-keyshortcuts="/"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <VideoIcon name="close" />
            </button>
          )}
        </form>
        <button
          type="button"
          className={styles.iconButton}
          disabled={busy}
          aria-label="Refresh channel playlists"
          title="Refresh channel playlists"
          onClick={refresh}
        >
          <VideoIcon name="refresh" />
        </button>
      </header>
      <nav className={styles.libraryNav} aria-label="Library navigation">
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Back to selected video"
          title="Back to selected video"
          disabled={!playing}
          onClick={() => {
            scrollWithinContainer(mainRef.current, playerRef.current);
            headingRef.current?.focus({ preventScroll: true });
          }}
        >
          <VideoIcon name="play" />
        </button>
        <label className={styles.playlistPicker}>
          <span className={styles.srOnly}>Choose a playlist</span>
          <VideoIcon name="playlist" />
          <select
            aria-label="Choose a playlist"
            value={playlistId}
            disabled={!playlists.length}
            onChange={(event) => {
              setCategory("all");
              choosePlaylist(event.target.value);
            }}
          >
            <option value={ALL_PLAYLIST_ID}>All collections</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Browse playlist collections"
          title="Browse playlist collections"
          onClick={() =>
            scrollWithinContainer(mainRef.current, collectionsRef.current)
          }
        >
          <VideoIcon name="grid" />
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={showSaved}
          onClick={() => {
            setShowSaved((value) => !value);
            setQuery("");
            scrollWithinContainer(mainRef.current, videosRef.current);
          }}
        >
          <VideoIcon name="clock" />
          Watch later
          {savedVideos.length > 0 && (
            <span className={styles.count}>{savedVideos.length}</span>
          )}
        </button>
      </nav>
      <main ref={mainRef} className={styles.main} aria-label="YouTube library">
        <div className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>CURATED BY ALEX UNNIPPILLIL</p>
            <h1>A collection worth exploring.</h1>
            <p className={styles.muted}>
              Handpicked videos. Organized playlists. One place to watch.
            </p>
          </div>
          <a
            className={styles.channel}
            href={`https://www.youtube.com/channel/${channel}/playlists`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.avatar}>AU</span>
            <span>
              {summary?.title ?? "Alex’s library"}
              <small>{loadingDirectory ? "Loading playlists…" : `${playlists.length} public playlists`}</small>
            </span>
            <VideoIcon name="external" />
          </a>
        </div>
        {directoryError && (
          <section className={styles.notice} role="alert">
            <h2>Could not load playlists</h2>
            <p>{directoryError}</p>
            <button className={styles.button} type="button" onClick={refresh}>
              Try again
            </button>
          </section>
        )}
        <section
          ref={playerRef}
          className={styles.watchLayout}
          data-theatre={theatre}
          aria-label="Selected video"
        >
          <div className={styles.watchMain}>
            <div className={styles.playerShell}>
              {playing ? (
                <EmbedFrame
                  key={playing.videoId}
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(playing.videoId)}?playsinline=1`}
                  title={`YouTube player for ${playing.title}`}
                  className={styles.embedFrame}
                  containerClassName={styles.embedContainer}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  fallbackLabel="Open on YouTube"
                  externalUrl={watchUrl(playing.videoId)}
                  showExternalLink={false}
                  loading="eager"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation"
                  loadingLabel="Loading YouTube player…"
                />
              ) : (
                <div className={styles.playerPlaceholder}>
                  <VideoIcon name="play" />
                  <p>
                    {busy
                      ? "Finding your first video…"
                      : "Select a video to begin."}
                  </p>
                </div>
              )}
            </div>
            {playing && (
              <div className={styles.nowPlaying}>
                <p className={styles.eyebrow}>
                  SELECTED VIDEO <span>· Press play to watch</span>
                </p>
                <h2 ref={headingRef} tabIndex={-1}>
                  {playing.title}
                </h2>
                <div className={styles.videoActions}>
                  <button
                    type="button"
                    className={styles.button}
                    aria-pressed={savedIds.has(playing.videoId)}
                    onClick={() => toggleSaved(playing)}
                  >
                    <VideoIcon
                      name={savedIds.has(playing.videoId) ? "check" : "clock"}
                    />
                    {savedIds.has(playing.videoId) ? "Saved" : "Save video"}
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => void share()}
                  >
                    <VideoIcon name="share" />
                    Share
                  </button>
                  <a
                    className={styles.button}
                    href={watchUrl(playing.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <VideoIcon name="external" />
                    Open on YouTube
                  </a>
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.theatreButton}`}
                    aria-label="Theatre view"
                    aria-pressed={theatre}
                    title="Theatre view"
                    onClick={() => setTheatre((value) => !value)}
                  >
                    <VideoIcon name="theatre" />
                  </button>
                  <span className={styles.transport}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Previous video"
                      disabled={currentIndex <= 0}
                      onClick={() => watch(sorted[currentIndex - 1])}
                    >
                      <VideoIcon name="previous" />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Next video"
                      disabled={
                        currentIndex < 0 || currentIndex >= sorted.length - 1
                      }
                      onClick={() => watch(sorted[currentIndex + 1])}
                    >
                      <VideoIcon name="next" />
                    </button>
                  </span>
                </div>
                {playing.description && (
                  <div className={styles.description}>
                    <p>
                      {expanded
                        ? playing.description
                        : playing.description.slice(0, 180) +
                          (playing.description.length > 180 ? "…" : "")}
                    </p>
                    {playing.description.length > 180 && (
                      <button
                        type="button"
                        className={styles.textButton}
                        aria-expanded={expanded}
                        onClick={() => setExpanded((value) => !value)}
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className={styles.queue} aria-label="Up next">
            <div className={styles.sectionHeading}>
              <h2>Up next</h2>
              <span className={styles.muted}>Your collection</span>
            </div>
            <p className={styles.queueHint}>
              Choose your next watch. Nothing autoplays.
            </p>
            <ol className={styles.queueList}>
              {queue.map((video, index) => (
                <li key={video.videoId}>
                  <button
                    type="button"
                    className={styles.queueButton}
                    aria-label={`Play next: ${video.title}`}
                    onClick={() => watch(video)}
                  >
                    <span className={styles.queueNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.thumbnail}>
                      {thumbnail(video.thumbnail)}
                      <VideoIcon name="play" />
                    </span>
                    <span className={styles.videoName}>{video.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            {!queue.length && (
              <p className={styles.muted}>Explore another collection below.</p>
            )}
            <button
              type="button"
              className={styles.textButton}
              onClick={() =>
                scrollWithinContainer(mainRef.current, videosRef.current)
              }
            >
              Explore all loaded videos <VideoIcon name="next" />
            </button>
          </aside>
        </section>
        <section
          ref={collectionsRef}
          className={styles.collections}
          aria-label="Playlist collections"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>FIND YOUR NEXT INTEREST</p>
              <h2>Browse collections</h2>
            </div>
          </div>
          <nav className={styles.chips} aria-label="Collection categories">
            <button
              type="button"
              aria-pressed={category === "all" && !showSaved}
              onClick={() => {
                setCategory("all");
                choosePlaylist(ALL_PLAYLIST_ID);
              }}
            >
              All collections
            </button>
            {sections.map((section) => (
              <button
                key={section.sectionId}
                type="button"
                aria-pressed={category === section.sectionId && !showSaved}
                onClick={() => {
                  setCategory(section.sectionId);
                  choosePlaylist(ALL_PLAYLIST_ID);
                }}
              >
                {section.sectionTitle}
              </button>
            ))}
          </nav>
          <ul className={styles.playlistRail} aria-label="Curated playlists">
            {visiblePlaylists.map((playlist, index) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  className={styles.playlistCard}
                  data-tone={index % 4}
                  aria-pressed={!showSaved && playlistId === playlist.id}
                  aria-label={`Open playlist ${playlist.title}`}
                  onClick={() => choosePlaylist(playlist.id)}
                >
                  <span className={styles.playlistArtwork}>
                    {thumbnail(
                      playlist.thumbnail ||
                        pages[playlist.id]?.items[0]?.thumbnail ||
                        "",
                    )}
                    <span className={styles.playlistGlyph}>
                      <VideoIcon name="playlist" />
                    </span>
                    <span className={styles.playlistCount}>
                      {playlist.itemCount} videos
                    </span>
                  </span>
                  <span className={styles.playlistText}>
                    <span className={styles.videoName}>{playlist.title}</span>
                    <span className={styles.muted}>
                      {playlistId === playlist.id && !showSaved
                        ? "Browsing this collection"
                        : "Explore playlist"}{" "}
                      <VideoIcon name="next" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!visiblePlaylists.length && !busy && (
            <p className={styles.muted}>
              {query
                ? "No playlists match this search."
                : "Public playlists will appear here when available."}
            </p>
          )}
        </section>
        <section
          ref={videosRef}
          className={styles.videos}
          aria-label="Video collection"
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2>{query ? `Results for “${query}”` : title}</h2>
              <p className={styles.muted}>
                {showSaved
                  ? "Saved on this browser, not your YouTube account."
                  : `${videos.length} loaded videos${activePlaylist ? " in this playlist" : " across the collection"}`}
              </p>
            </div>
            <label className={styles.sort}>
              <span className={styles.srOnly}>Sort videos</span>
              <select
                aria-label="Sort videos"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as VideoSortMode)
                }
              >
                <option value="playlist">Curated order</option>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
          {activePlaylist?.description && !query && !showSaved && (
            <p className={styles.collectionDescription}>
              {activePlaylist.description}
            </p>
          )}
          {videos.length > 0 && (
            <ul className={styles.videoGrid} aria-label="Playlist videos">
              {videos.map((video) => (
                <li
                  key={video.videoId}
                  className={styles.videoCard}
                  data-active={playing?.videoId === video.videoId}
                >
                  <button
                    type="button"
                    className={styles.watchButton}
                    aria-label={`Watch ${video.title}`}
                    aria-current={
                      playing?.videoId === video.videoId ? "true" : undefined
                    }
                    onClick={() => watch(video)}
                  >
                    <span className={styles.thumbnail}>
                      {thumbnail(video.thumbnail)}
                      <VideoIcon name="play" />
                      {playing?.videoId === video.videoId && (
                        <span className={styles.selectedBadge}>Selected</span>
                      )}
                    </span>
                    <span className={styles.cardText}>
                      <span className={styles.videoName}>{video.title}</span>
                      <span className={styles.muted}>
                        {dateLabel(video.publishedAt) ||
                          "From the curated library"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.saveButton}
                    aria-pressed={savedIds.has(video.videoId)}
                    aria-label={`${savedIds.has(video.videoId) ? "Remove" : "Save"} ${video.title} ${savedIds.has(video.videoId) ? "from Watch later" : "for later"}`}
                    onClick={() => toggleSaved(video)}
                  >
                    <VideoIcon
                      name={savedIds.has(video.videoId) ? "check" : "clock"}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!videos.length && !busy && (
            <div className={styles.empty}>
              <VideoIcon name={showSaved ? "clock" : "search"} />
              <h3>
                {query
                  ? "No matching videos"
                  : showSaved
                    ? "Your next watch starts here"
                    : "No videos to show yet"}
              </h3>
              <p>
                {query
                  ? "Search covers loaded videos. The selected video stays ready above."
                  : showSaved
                    ? "Use the clock on any video to save it for later."
                    : "Choose another collection or refresh the library."}
              </p>
              {query && (
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
          {busy && (
            <p className={styles.loading} role="status">
              Loading {loadingDirectory ? "channel playlists" : "videos"}…
            </p>
          )}
          {hasErrors && (
            <div className={styles.notice} role="status">
              <p>
                Some playlist videos could not load. Available videos remain
                ready to watch.
              </p>
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() => void retryErrors()}
              >
                Retry failed playlists
              </button>
            </div>
          )}
          {hasMore && (
            <div className={styles.loadMore}>
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() =>
                  activePlaylist
                    ? void loadPage(activePlaylist.id, true)
                    : void loadAll(true)
                }
              >
                {busy ? "Loading…" : "Load more videos"}
              </button>
              <p className={styles.muted}>
                Search and sorting include the videos loaded so far.
              </p>
            </div>
          )}
        </section>
        <footer className={styles.footer}>
          Curated by Alex Unnippillil · Videos play on YouTube. This portfolio
          library is not affiliated with YouTube.
        </footer>
      </main>
      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
