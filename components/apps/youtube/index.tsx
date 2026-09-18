'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import EmbedFrame from '../../EmbedFrame';
import useWatchLater from '../../../apps/youtube/state/watchLater';
import { useSettings } from '../../../hooks/useSettings';
import useYouTubeLibrary from '../../../hooks/useYouTubeLibrary';
import { parseYouTubeChannelId, type YouTubePlaylistVideo } from '../../../utils/youtube';
import {
  ALL_PLAYLIST_ID, filterDirectoryBySearch, filterPlaylistVideos, mergeUniqueVideos, sortPlaylistVideos,
  type VideoSortMode,
} from '../../../utils/youtube-library';
import VideoIcon from './VideoIcon';
import styles from './youtube.module.css';

// Keep the public helper API used by existing integrations and regression tests.
export { filterDirectoryBySearch, filterPlaylistVideos, sortPlaylistVideos } from '../../../utils/youtube-library';
export type { PlaylistListing, PlaylistItemsState } from '../../../utils/youtube-library';

const DEFAULT_CHANNEL_ID = 'UCxPIJ3hw6AOwomUWh5B7SfQ';
type View = 'home' | 'playlists' | 'saved';
const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function YouTubeApp({ channelId }: { channelId?: string }) {
  const { allowNetwork, setAllowNetwork } = useSettings();
  const resolvedChannelId = parseYouTubeChannelId(channelId ?? '') ??
    parseYouTubeChannelId(process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID ?? '') ?? DEFAULT_CHANNEL_ID;
  const library = useYouTubeLibrary(resolvedChannelId, allowNetwork);
  const { directory, summary, pages, loadingDirectory, directoryError, loadingAll, loadPage, loadAll, retryErrors, refresh } = library;
  const [saved, setSaved] = useWatchLater();
  const [view, setView] = useState<View>('home');
  const [playlistId, setPlaylistId] = useState(ALL_PLAYLIST_ID);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<VideoSortMode>('newest');
  const [playing, setPlaying] = useState<YouTubePlaylistVideo | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [theatre, setTheatre] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [compact, setCompact] = useState(true);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const returnVideoId = useRef<string | null>(null);
  const id = useId();

  // A desktop window may be narrow on a large monitor: measure the app, not the screen.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const measure = () => setCompact(node.getBoundingClientRect().width < 840);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setNavigationOpen(!compact), [compact]);
  useEffect(() => {
    setPlaylistId(ALL_PLAYLIST_ID);
    setPlaying(null);
  }, [resolvedChannelId]);

  // Empty and failed pages are terminal until the user explicitly refreshes/retries.
  useEffect(() => {
    if (!directory || !allowNetwork || view !== 'home') return;
    if (playlistId === ALL_PLAYLIST_ID) {
      const needsPage = directory.playlists.some(({ id: key }) => !pages[key] ||
        (!pages[key].loaded && !pages[key].loading && !pages[key].error));
      if (needsPage && !loadingAll) void loadAll();
    } else if (directory.playlists.some((playlist) => playlist.id === playlistId)) {
      const page = pages[playlistId];
      if (!page || (!page.loaded && !page.loading && !page.error)) void loadPage(playlistId);
    }
  }, [allowNetwork, directory, view, playlistId, pages, loadingAll, loadAll, loadPage]);

  useEffect(() => {
    if (directory && playlistId !== ALL_PLAYLIST_ID && !directory.playlists.some((playlist) => playlist.id === playlistId)) {
      setPlaylistId(ALL_PLAYLIST_ID);
    }
  }, [directory, playlistId]);

  useEffect(() => {
    setDescriptionExpanded(false);
    if (playing) {
      titleRef.current?.focus({ preventScroll: true });
      mainRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
    } else if (returnVideoId.current) {
      const button = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-video-id]') ?? [])
        .find((node) => node.dataset.videoId === returnVideoId.current);
      button?.focus({ preventScroll: true });
    }
  }, [playing]);

  const allVideos = useMemo(() => mergeUniqueVideos(...(directory?.playlists ?? []).map((playlist) => pages[playlist.id]?.items ?? [])), [directory, pages]);
  const savedVideos = useMemo(() => saved.map((video, position) => allVideos.find((item) => item.videoId === video.id) ?? {
    videoId: video.id, title: video.title, thumbnail: video.thumbnail, description: '', publishedAt: '', position,
  }), [saved, allVideos]);
  const selectedPlaylist = directory?.playlists.find((playlist) => playlist.id === playlistId);
  const sortedVideos = useMemo(() => {
    const source = view === 'saved' ? savedVideos : playlistId === ALL_PLAYLIST_ID ? allVideos : pages[playlistId]?.items ?? [];
    return sortPlaylistVideos(source, sort);
  }, [view, savedVideos, playlistId, allVideos, pages, sort]);
  const visibleVideos = useMemo(() => filterPlaylistVideos(sortedVideos, query), [sortedVideos, query]);
  const sections = useMemo(() => {
    if (!directory) return [];
    const entries = directory.sections.length ? directory.sections : [{ sectionId: 'all', sectionTitle: 'Playlists', playlists: directory.playlists }];
    return filterDirectoryBySearch(entries, query, pages);
  }, [directory, query, pages]);
  const savedIds = useMemo(() => new Set(saved.map((video) => video.id)), [saved]);
  const relevantIds = playlistId === ALL_PLAYLIST_ID ? (directory?.playlists ?? []).map((playlist) => playlist.id) : [playlistId];
  const busy = loadingDirectory || (view === 'home' && (loadingAll || relevantIds.some((key) => pages[key]?.loading)));
  const hasMore = view === 'home' && relevantIds.some((key) => Boolean(pages[key]?.nextPageToken));
  const hasErrors = view === 'home' && relevantIds.some((key) => Boolean(pages[key]?.error));
  const currentIndex = playing ? sortedVideos.findIndex((video) => video.videoId === playing.videoId) : -1;
  const currentTitle = view === 'saved' ? 'Watch later' : selectedPlaylist?.title ?? 'For you';

  const openView = (next: View) => {
    setView(next);
    setPlaying(null);
    setQuery('');
    if (next === 'home') {
      setPlaylistId(ALL_PLAYLIST_ID);
      if (sort === 'playlist') setSort('newest');
    }
    if (compact) setNavigationOpen(false);
  };
  const openPlaylist = (next: string) => {
    setPlaylistId(next);
    setView('home');
    setPlaying(null);
    setQuery('');
    if (compact) setNavigationOpen(false);
  };
  const watch = (video: YouTubePlaylistVideo) => {
    returnVideoId.current = video.videoId;
    setPlaying(video);
  };
  const toggleSaved = (video: YouTubePlaylistVideo) => {
    const removing = savedIds.has(video.videoId);
    setSaved((previous) => removing ? previous.filter((item) => item.id !== video.videoId) : [
      ...previous.filter((item) => item.id !== video.videoId),
      { id: video.videoId, title: video.title, thumbnail: video.thumbnail, channelName: summary?.title ?? '', channelId: resolvedChannelId },
    ]);
    setAnnouncement(removing ? 'Removed from Watch later on this browser.' : 'Saved to Watch later on this browser.');
  };
  const share = async () => {
    if (!playing) return;
    const url = watchUrl(playing.videoId);
    try {
      if (window.navigator.share) await window.navigator.share({ title: playing.title, url });
      else if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(url);
        setAnnouncement('Video link copied.');
      } else setAnnouncement('Use Open on YouTube to copy the video link from your browser.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setAnnouncement('Sharing is unavailable. Use Open on YouTube instead.');
    }
  };
  const loadMore = () => playlistId === ALL_PLAYLIST_ID ? void loadAll(true) : void loadPage(playlistId, true);

  const renderCard = (video: YouTubePlaylistVideo, queue = false) => <li key={video.videoId} className={queue ? styles.queueCard : styles.videoCard} data-active={playing?.videoId === video.videoId}>
    <button type="button" className={styles.watchButton} data-video-id={video.videoId} aria-label={`Watch ${video.title}`} aria-current={playing?.videoId === video.videoId ? 'true' : undefined} onClick={() => watch(video)}>
      <span className={styles.thumbnail}>
        {allowNetwork && video.thumbnail ? <img src={video.thumbnail} alt="" width="480" height="270" loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : <VideoIcon name="play" />}
        <span className={styles.playOverlay}><VideoIcon name="play" /></span>
        {playing?.videoId === video.videoId && <span className={styles.playingBadge}>Now playing</span>}
      </span>
      <span className={styles.cardText}><span className={styles.videoName}>{video.title}</span><span className={styles.muted}>{dateLabel(video.publishedAt) || 'From your playlist library'}</span></span>
    </button>
    <button type="button" className={styles.saveButton} aria-pressed={savedIds.has(video.videoId)} aria-label={`${savedIds.has(video.videoId) ? 'Remove' : 'Save'} ${video.title} ${savedIds.has(video.videoId) ? 'from Watch later' : 'for later'}`} onClick={() => toggleSaved(video)} title={savedIds.has(video.videoId) ? 'Remove from Watch later' : 'Watch later'}><VideoIcon name={savedIds.has(video.videoId) ? 'check' : 'clock'} /></button>
  </li>;

  return <div ref={rootRef} className={styles.container} data-testid="youtube-app" onKeyDown={(event) => {
    if (event.key === 'Escape' && navigationOpen && compact) {
      event.preventDefault(); event.stopPropagation(); setNavigationOpen(false); menuRef.current?.focus(); return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '/') {
      event.preventDefault(); event.stopPropagation(); searchRef.current?.focus();
    }
  }}>
    <header className={styles.header}>
      <div className={styles.brandGroup}>
        <button ref={menuRef} type="button" className={styles.iconButton} aria-label="Toggle YouTube navigation" aria-expanded={navigationOpen} aria-controls={`${id}-navigation`} onClick={() => setNavigationOpen((value) => !value)}><VideoIcon name="menu" /></button>
        <button type="button" className={styles.brand} onClick={() => openView('home')} aria-label="YouTube home"><span className={styles.logo}><VideoIcon name="play" /></span><span>YouTube<span className={styles.brandSuffix}>Library</span></span></button>
      </div>
      <form className={styles.search} role="search" aria-label="YouTube library search" onSubmit={(event) => event.preventDefault()}>
        <label className={styles.srOnly} htmlFor={`${id}-search`}>Search playlists or loaded videos</label>
        <input ref={searchRef} id={`${id}-search`} type="search" placeholder="Search your library" value={query} onChange={(event) => setQuery(event.target.value)} aria-keyshortcuts="/" autoComplete="off" />
        {query && <button type="button" className={styles.iconButton} aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><VideoIcon name="close" /></button>}
        <button type="submit" className={styles.searchSubmit} aria-label="Search library"><VideoIcon name="search" /></button>
      </form>
      <div className={styles.headerActions}>
        <button type="button" className={styles.iconButton} onClick={refresh} disabled={loadingDirectory || !allowNetwork} aria-label="Refresh channel playlists" title="Refresh channel playlists"><VideoIcon name="refresh" /></button>
        <a href={`https://www.youtube.com/channel/${resolvedChannelId}`} target="_blank" rel="noopener noreferrer" className={styles.channelLink} aria-label={`Open ${summary?.title ?? 'channel'} on YouTube`}>
          {summary?.thumbnail && allowNetwork ? <img src={summary.thumbnail} width="36" height="36" alt="" referrerPolicy="no-referrer" /> : <span aria-hidden="true">AU</span>}
        </a>
      </div>
    </header>
    <div className={styles.layout} data-navigation={navigationOpen}>
      <aside id={`${id}-navigation`} className={styles.sidebar} hidden={!navigationOpen}>
        <nav aria-label="YouTube navigation">
          {([['home', 'home', 'Home'], ['playlists', 'playlist', 'Playlists'], ['saved', 'clock', 'Watch later']] as const).map(([next, icon, label]) => <button type="button" key={next} className={styles.navButton} aria-current={view === next ? 'page' : undefined} onClick={() => openView(next)}><VideoIcon name={icon} /><span>{label}</span>{next === 'saved' && saved.length > 0 && <span className={styles.count}>{saved.length}</span>}</button>)}
        </nav>
        <div className={styles.sideSection}><h2>Your playlists</h2>{(directory?.playlists ?? []).map((playlist) => <button type="button" className={styles.navButton} key={playlist.id} aria-label={`Open playlist ${playlist.title}`} aria-current={playlistId === playlist.id && view === 'home' ? 'page' : undefined} onClick={() => openPlaylist(playlist.id)}><VideoIcon name="playlist" /><span>{playlist.title}</span></button>)}</div>
        <p className={styles.sidebarNote}>Public playlists from {summary?.title ?? 'Alex Unnippillil'}. Watch later is saved only on this browser. This portfolio player is not affiliated with YouTube.</p>
      </aside>
      <main ref={mainRef} className={styles.main} aria-label="YouTube library">
        {!allowNetwork && <section className={styles.notice}><h2>Connect your video library</h2><p>Network access is off in desktop settings. Enable it to load this channel’s public playlists and YouTube player.</p><button type="button" className={styles.primaryButton} onClick={() => setAllowNetwork(true)}>Enable network</button></section>}
        {directoryError && <section className={styles.notice} role="alert"><h2>Could not load playlists</h2><p>{directoryError}</p><button type="button" className={styles.button} onClick={refresh}>Try again</button></section>}
        {playing ? <>
          <div className={styles.watchToolbar}><button type="button" className={styles.button} onClick={() => setPlaying(null)}><VideoIcon name="back" />Back to videos</button><button type="button" className={styles.button} aria-pressed={theatre} onClick={() => setTheatre((value) => !value)}><VideoIcon name="theatre" />Theatre view</button></div>
          <div className={styles.watchLayout} data-theatre={theatre}>
            <section className={styles.watchMain} aria-label="Video player">
              <div className={styles.playerShell}>{allowNetwork ? <EmbedFrame key={playing.videoId} title={`YouTube player for ${playing.title}`} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(playing.videoId)}?playsinline=1`} className={styles.embedFrame} containerClassName={styles.embedContainer} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" fallbackLabel="Open on YouTube" openInNewTabLabel="Open on YouTube" loadingLabel="Loading YouTube player…" /> : <p>Enable network to play this video.</p>}</div>
              <h1 ref={titleRef} tabIndex={-1} className={styles.watchTitle}>{playing.title}</h1>
              <div className={styles.videoActions}><span className={styles.channelName}>{summary?.title ?? 'Playlist video'}</span><button type="button" className={styles.button} aria-pressed={savedIds.has(playing.videoId)} onClick={() => toggleSaved(playing)}><VideoIcon name={savedIds.has(playing.videoId) ? 'check' : 'clock'} />{savedIds.has(playing.videoId) ? 'Saved' : 'Watch later'}</button><button type="button" className={styles.button} onClick={() => void share()}><VideoIcon name="share" />Share</button><a className={styles.button} href={watchUrl(playing.videoId)} target="_blank" rel="noopener noreferrer"><VideoIcon name="external" />Open on YouTube</a></div>
              <div className={styles.description}><p className={styles.date}>{dateLabel(playing.publishedAt)}</p><p>{playing.description ? descriptionExpanded ? playing.description : playing.description.slice(0, 240) + (playing.description.length > 240 ? '…' : '') : 'No description provided for this video.'}</p>{playing.description.length > 240 && <button type="button" className={styles.textButton} aria-expanded={descriptionExpanded} onClick={() => setDescriptionExpanded((value) => !value)}>{descriptionExpanded ? 'Show less' : 'Show more'}</button>}</div>
            </section>
            <section className={styles.queue} aria-label="Playlist queue"><div className={styles.sectionHeading}><div><h2>Up next</h2><p className={styles.muted}>{currentIndex >= 0 ? `${currentIndex + 1} / ${sortedVideos.length}` : `${sortedVideos.length} loaded videos`}</p></div><div className={styles.queueArrows}><button type="button" className={styles.iconButton} aria-label="Previous video" disabled={currentIndex <= 0} onClick={() => watch(sortedVideos[currentIndex - 1])}><VideoIcon name="previous" /></button><button type="button" className={styles.iconButton} aria-label="Next video" disabled={currentIndex < 0 || currentIndex >= sortedVideos.length - 1} onClick={() => watch(sortedVideos[currentIndex + 1])}><VideoIcon name="next" /></button></div></div><ul className={styles.queueList} aria-label="Playlist videos">{visibleVideos.map((video) => renderCard(video, true))}</ul>{query && !visibleVideos.length && <p>No loaded videos match this search. The current video keeps playing.</p>}</section>
          </div>
        </> : view === 'playlists' ? <>
          <div className={styles.pageHeading}><h1>Playlists</h1><p className={styles.muted}>{directory?.playlists.length ?? 0} public playlists from {summary?.title ?? 'this channel'}</p></div>
          <div><h2 className={styles.sectionTitle}>Categories</h2>{sections.map((section) => <section className={styles.playlistSection} key={section.sectionId}><h3>{section.sectionTitle}</h3><ul className={styles.videoGrid} aria-label={`${section.sectionTitle} playlists`}>{section.playlists.map((playlist) => <li key={playlist.id}><button type="button" className={styles.playlistCard} aria-label={`Open playlist ${playlist.title}`} onClick={() => openPlaylist(playlist.id)}><span className={styles.thumbnail}>{allowNetwork && playlist.thumbnail ? <img src={playlist.thumbnail} alt="" width="480" height="270" loading="lazy" referrerPolicy="no-referrer" /> : <VideoIcon name="playlist" />}<span className={styles.playlistBadge}><VideoIcon name="playlist" />{playlist.itemCount} videos</span></span><span className={styles.videoName}>{playlist.title}</span><span className={styles.muted}>View playlist</span></button></li>)}</ul></section>)}</div>
          {!busy && !sections.length && <div className={styles.empty}><VideoIcon name="playlist" /><h2>{query ? 'No matching playlists' : 'No public playlists yet'}</h2><p>{query ? 'Try a different title or clear your search.' : 'Refresh after public playlists are added to this channel.'}</p></div>}
        </> : <>
          <nav className={styles.chips} aria-label="Video library filters"><button type="button" aria-pressed={view === 'home' && playlistId === ALL_PLAYLIST_ID} onClick={() => openView('home')}>All videos</button><button type="button" aria-pressed={view === 'saved'} onClick={() => openView('saved')}><VideoIcon name="clock" />Watch later</button><button type="button" onClick={() => openView('playlists')}><VideoIcon name="playlist" />Playlists</button>{(directory?.playlists ?? []).map((playlist) => <button type="button" key={playlist.id} aria-pressed={playlistId === playlist.id && view === 'home'} onClick={() => openPlaylist(playlist.id)}>{playlist.title}</button>)}</nav>
          <div className={styles.pageHeading}><div><h1>{query ? `Search results for “${query}”` : currentTitle}</h1><p className={styles.muted}>{view === 'saved' ? 'Saved on this browser, not your YouTube account.' : `${visibleVideos.length} loaded videos · ${summary?.title ?? 'Account playlists'}`}</p></div><label className={styles.sort}>Sort<select aria-label="Sort videos" value={sort} onChange={(event) => setSort(event.target.value as VideoSortMode)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option>{playlistId !== ALL_PLAYLIST_ID && <option value="playlist">Playlist order</option>}</select></label></div>
          {visibleVideos.length ? <ul className={styles.videoGrid} aria-label="Playlist videos">{visibleVideos.map((video) => renderCard(video))}</ul> : !busy && allowNetwork && !directoryError ? <div className={styles.empty}><VideoIcon name={view === 'saved' ? 'clock' : 'search'} /><h2>{query ? 'No matching videos' : view === 'saved' ? 'Your next watch starts here' : 'No videos to show yet'}</h2><p>{query ? 'Search covers loaded videos. Try another phrase or load more from the playlists.' : view === 'saved' ? 'Use the clock on any video to save it for later.' : 'Choose a playlist or refresh the channel library.'}</p>{query && <button type="button" className={styles.button} onClick={() => setQuery('')}>Clear search</button>}</div> : null}
        </>}
        {busy && <><p className={styles.loading} role="status">Loading {loadingDirectory ? 'channel playlists' : 'videos'}…</p>{!visibleVideos.length && <div className={styles.videoGrid} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton}><div /><span /><span /></div>)}</div>}</>}
        {hasErrors && <div className={styles.notice} role="status"><p>Some playlist videos could not load. Your available videos are still here.</p><button type="button" className={styles.button} disabled={busy} onClick={() => void retryErrors()}>Retry failed playlists</button></div>}
        {hasMore && <div className={styles.loadMore}><button type="button" className={styles.button} disabled={busy} onClick={loadMore}>{busy ? 'Loading…' : 'Load more videos'}</button><p className={styles.muted}>Search and sorting include the videos loaded so far.</p></div>}
      </main>
    </div>
    <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
  </div>;
}
