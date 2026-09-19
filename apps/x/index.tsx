"use client";
import { useId, useMemo, useRef, useState, type SVGProps } from "react";
import useXProfile from "../../hooks/useXProfile";
import {
  filterXPosts,
  postTextParts,
  X_HANDLE,
  X_PROFILE_URL,
  xPostUrl,
  type FeedIssue,
  type PostFilter,
  type XPost,
} from "../../utils/x-profile";
import styles from "./profile.module.css";

type IconName =
  | "x"
  | "refresh"
  | "external"
  | "search"
  | "link"
  | "reply"
  | "repeat"
  | "heart"
  | "image"
  | "clock"
  | "arrow";
function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    x: (
      <path
        d="m18.9 2h3.3l-7.2 8.2L23.5 22h-6.7l-5.2-6.9L5.5 22H2.1l7.9-9L1.8 2h6.9l4.7 6.3L18.9 2Zm-1.2 18h1.8L7.7 3.9H5.8L17.7 20Z"
        fill="currentColor"
        stroke="none"
      />
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5" />
        <path d="M6.1 6a8 8 0 0 1 13.3 3M4.6 15a8 8 0 0 0 13.3 3" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7M21 3 10 14" />
        <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    link: (
      <>
        <path
          d="m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0M16 8l2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"
          transform="translate(1 0) scale(.9)"
        />
      </>
    ),
    reply: (
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
    ),
    repeat: (
      <>
        <path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
const count = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
const filters: { id: PostFilter; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "replies", label: "Replies" },
  { id: "media", label: "Media" },
];

function Avatar({ src, large = false }: { src?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`}>
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={large ? 80 : 40}
          height={large ? 80 : 40}
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span aria-hidden="true">AU</span>
      )}
    </span>
  );
}
function Media({ post }: { post: XPost }) {
  const [revealed, setRevealed] = useState(!post.sensitive);
  if (!post.media.length) return null;
  if (!revealed)
    return (
      <div className={styles.sensitive}>
        <Icon name="image" />
        <p>This post may contain sensitive media.</p>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setRevealed(true)}
        >
          Show media
        </button>
      </div>
    );
  return (
    <div className={styles.mediaGrid} data-count={post.media.length}>
      {post.media.map((media) => (
        <a
          className={styles.media}
          href={xPostUrl(post.id)}
          key={media.key}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            media.type === "photo" ? "View photo on X" : "Watch video on X"
          }
        >
          <img
            src={media.src}
            alt={media.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <span className={styles.mediaLabel}>
            <Icon name={media.type === "photo" ? "image" : "external"} />
            {media.type === "photo" ? "View on X" : "Watch on X"}
          </span>
        </a>
      ))}
    </div>
  );
}
function PostCard({
  post,
  name,
  avatar,
  onCopy,
}: {
  post: XPost;
  name: string;
  avatar?: string;
  onCopy: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = post.text.length > 650;
  const displayed =
    long && !expanded ? { ...post, text: `${post.text.slice(0, 650)}…` } : post;
  return (
    <article
      className={styles.post}
      aria-label={`Post by ${name}${post.createdAt ? ` on ${dateLabel(post.createdAt)}` : ""}`}
    >
      <a
        className={styles.postAvatar}
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit @${X_HANDLE}`}
      >
        <Avatar key={avatar} src={avatar} />
      </a>
      <div className={styles.postBody}>
        <div className={styles.postHeader}>
          <a
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.author}
          >
            {name}
          </a>
          <span className={styles.handle}>@{X_HANDLE}</span>
          {post.createdAt && (
            <a
              className={styles.date}
              href={xPostUrl(post.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <time dateTime={post.createdAt}>{dateLabel(post.createdAt)}</time>
            </a>
          )}
          <Icon name="x" className={styles.postLogo} />
        </div>
        {post.replyTo && (
          <a
            className={styles.context}
            href={xPostUrl(post.replyTo)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="reply" />
            Reply · View conversation
          </a>
        )}
        <p className={styles.postText} dir="auto">
          {postTextParts(displayed).map((part, index) =>
            part.href ? (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {part.text}
              </a>
            ) : (
              part.text
            ),
          )}
        </p>
        {long && (
          <button
            type="button"
            className={styles.textButton}
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : "Read full post"}
          </button>
        )}
        {post.quoteId && (
          <a
            className={styles.quote}
            href={xPostUrl(post.quoteId)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View quoted post on X <Icon name="external" />
          </a>
        )}
        <Media post={post} />
        <div className={styles.postFooter}>
          <div className={styles.metrics} aria-label="Public engagement counts">
            {(
              [
                ["replies", "reply", "replies"],
                ["reposts", "repeat", "reposts"],
                ["likes", "heart", "likes"],
              ] as const
            ).map(
              ([metric, icon, label]) =>
                post.metrics[metric] !== undefined && (
                  <span
                    key={metric}
                    aria-label={`${post.metrics[metric]} ${label}`}
                    title={`${post.metrics[metric]} ${label}`}
                  >
                    <Icon name={icon} />
                    {count(post.metrics[metric]!)}
                  </span>
                ),
            )}
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Copy post link"
            onClick={() => onCopy(xPostUrl(post.id))}
          >
            <Icon name="link" />
          </button>
          <a
            className={styles.openPost}
            href={xPostUrl(post.id)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open post <Icon name="external" />
          </a>
        </div>
      </div>
    </article>
  );
}
const issueCopy: Record<FeedIssue, [string, string]> = {
  not_configured: [
    "The saved selection is not available yet",
    "This profile has no published post archive yet, and its optional server connection is not configured. Open the original profile below.",
  ],
  unavailable: [
    "Posts are temporarily unavailable",
    "The X connection could not be completed. The public profile is still available on X.",
  ],
  rate_limited: [
    "The feed is taking a break",
    "X has reached an API usage or rate limit. Please try again later, or view the profile directly.",
  ],
  timeout: [
    "X is taking longer than expected",
    "The request timed out safely. Try again, or continue to the public profile.",
  ],
  invalid_cursor: [
    "This page has expired",
    "Refresh the feed to get a new link to older posts.",
  ],
  offline: [
    "External connections are paused",
    "Enable network access to load public posts and images from X. Your browser never receives the account credentials.",
  ],
  static_export: [
    "The saved selection is not available yet",
    "This edition has no published post archive yet. Open the original profile to read Alex’s posts.",
  ],
};

export default function XProfileApp() {
  const { feed, source, issue, busy, refresh, loadMore, retry } = useXProfile();
  const [filter, setFilter] = useState<PostFilter>("posts");
  const [query, setQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const searchId = useId();
  const content = useRef<HTMLDivElement>(null);
  const profile = feed?.profile;
  const name = profile?.name || "Alex Unnippillil";
  const posts = useMemo(
    () => filterXPosts(feed?.posts || [], filter, query),
    [feed, filter, query],
  );
  const visibleIssue = issue;
  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setAnnouncement("Link copied.");
    } catch {
      setAnnouncement("Copy is unavailable. Use the Open on X link instead.");
    }
  };
  return (
    <div className={styles.app} data-testid="x-profile-app">
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <Icon name="x" width="25" height="25" />
          <div>
            <strong>Alex on X</strong>
            <span>Profile showcase</span>
          </div>
        </div>
        <span className={styles.readOnly}>
          {source === "saved" ? "Saved posts" : "Read-only"}
        </span>
        {source !== "saved" && (
          <button
            type="button"
            className={styles.iconButton}
            disabled={
              Boolean(busy) || process.env.NEXT_PUBLIC_STATIC_EXPORT === "true"
            }
            onClick={() => {
              void refresh();
            }}
            aria-label="Refresh posts"
          >
            <Icon
              name="refresh"
              className={busy ? styles.spinning : undefined}
            />
          </button>
        )}
        <a
          className={styles.toolbarLink}
          href={X_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open profile on X"
        >
          <span>Open on X</span>
          <Icon name="external" />
        </a>
      </header>
      <div
        className={styles.scroll}
        ref={content}
        data-testid="x-profile-scroll"
      >
        <div className={styles.layout}>
          <nav className={styles.profileNav} aria-label="Profile navigation">
            <Icon name="x" width="31" height="31" />
            <button
              type="button"
              onClick={() =>
                content.current?.scrollTo({ top: 0, behavior: "auto" })
              }
            >
              <span className={styles.navAvatar}>AU</span>Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("posts");
                setQuery("");
              }}
              aria-label="Browse all posts"
            >
              <Icon name="clock" />
              Posts
            </button>
            <button
              type="button"
              onClick={() => {
                document.getElementById(searchId)?.focus();
              }}
              aria-label="Find a post"
            >
              <Icon name="search" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setFilter("media");
                setQuery("");
              }}
              aria-label="Browse media posts"
            >
              <Icon name="image" />
              Media
            </button>
            <a href={X_PROFILE_URL} target="_blank" rel="noopener noreferrer">
              <Icon name="external" />
              View on X
            </a>
            <p>
              Alex Unnippillil
              <br />
              <span>@{X_HANDLE}</span>
            </p>
          </nav>
          <main className={styles.timeline} aria-label="X profile timeline">
            <section className={styles.profile} aria-label="Profile details">
              <div className={styles.banner}>
                {profile?.banner ? (
                  <img
                    src={profile.banner}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <>
                    <span className={styles.bannerGrid} />
                    <span className={styles.bannerTag}>FROM THE DESKTOP</span>
                    <Icon name="x" className={styles.bannerLogo} />
                  </>
                )}
              </div>
              <div className={styles.profileBody}>
                <div className={styles.profileActions}>
                  <Avatar key={profile?.avatar} src={profile?.avatar} large />
                  <a
                    className={styles.primary}
                    href={X_PROFILE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit profile <Icon name="arrow" />
                  </a>
                </div>
                <h1>{name}</h1>
                <p className={styles.profileHandle}>@{X_HANDLE}</p>
                <p className={styles.bio}>
                  {profile
                    ? profile.description ||
                      "Public posts from Alex’s X profile."
                    : "Posts, conversations, and updates from my corner of X."}
                </p>
                {(profile?.location || profile?.joined || profile?.website) && (
                  <div className={styles.profileMeta}>
                    {profile.location && <span>{profile.location}</span>}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icon name="link" />
                        {new URL(profile.website).hostname}
                      </a>
                    )}
                    {profile.joined && (
                      <span>
                        <Icon name="clock" />
                        Joined{" "}
                        {new Date(profile.joined).toLocaleDateString("en", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </span>
                    )}
                  </div>
                )}
                {profile && (
                  <div className={styles.profileCounts}>
                    {profile.following !== undefined && (
                      <span>
                        <strong>{count(profile.following)}</strong> Following
                      </span>
                    )}
                    {profile.followers !== undefined && (
                      <span>
                        <strong>{count(profile.followers)}</strong> Followers
                      </span>
                    )}
                    {profile.posts !== undefined && (
                      <span>
                        <strong>{count(profile.posts)}</strong> Posts
                      </span>
                    )}
                  </div>
                )}
              </div>
            </section>
            <nav className={styles.tabs} aria-label="Post filters">
              {filters.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={filter === item.id}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className={styles.feedTools}>
              <label className={styles.search} htmlFor={searchId}>
                <Icon name="search" />
                <input
                  type="search"
                  id={searchId}
                  aria-label="Search loaded posts"
                  placeholder="Search this profile"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  maxLength={200}
                />
              </label>
              <span className={styles.loadedCount}>
                {feed
                  ? `${posts.length} shown · ${feed.posts.length} loaded`
                  : "Public posts only"}
              </span>
            </div>
            <div className={styles.feed} aria-busy={Boolean(busy)}>
              {visibleIssue && (
                <section className={styles.empty} role="status">
                  <div className={styles.emptyIcon}>
                    <Icon name="x" width="30" height="30" />
                  </div>
                  <h2>{issueCopy[visibleIssue][0]}</h2>
                  <p>{issueCopy[visibleIssue][1]}</p>
                  <div className={styles.emptyActions}>
                    {visibleIssue !== "static_export" && (
                      <button
                        type="button"
                        className={styles.secondary}
                        disabled={Boolean(busy)}
                        onClick={() => {
                          void retry();
                        }}
                      >
                        Try again
                      </button>
                    )}
                    <a
                      className={styles.secondary}
                      href={X_PROFILE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on X <Icon name="external" />
                    </a>
                  </div>
                  {visibleIssue === "not_configured" && (
                    <details className={styles.ownerHelp}>
                      <summary>Setup for the site owner</summary>
                      <p>
                        Publish a reviewed selection using{" "}
                        <code>yarn x:import</code>. See{" "}
                        <code>docs/x-profile-showcase.md</code> for the archive
                        format. Saved posts need no API keys, login, or visitor
                        confirmation. A server-only <code>X_BEARER_TOKEN</code>{" "}
                        remains optional.
                      </p>
                    </details>
                  )}
                </section>
              )}
              {busy === "initial" && !feed && (
                <div
                  className={styles.skeletons}
                  role="status"
                  aria-label="Loading posts"
                >
                  {[1, 2, 3].map((value) => (
                    <div
                      className={styles.skeleton}
                      key={value}
                      aria-hidden="true"
                    >
                      <i />
                      <div>
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  name={name}
                  avatar={profile?.avatar}
                  onCopy={(url) => {
                    void copyLink(url);
                  }}
                />
              ))}
              {feed && !posts.length && !busy && !visibleIssue && (
                <div className={styles.empty}>
                  <Icon
                    name={filter === "media" ? "image" : "search"}
                    width="30"
                    height="30"
                  />
                  <h2>
                    {query
                      ? "No matching posts"
                      : filter === "replies"
                        ? "No replies in this selection"
                        : filter === "media"
                          ? "No media in this selection"
                          : "No public posts to show"}
                  </h2>
                  <p>
                    {query
                      ? "Search covers the posts loaded here, not the whole X archive."
                      : "Load older posts when available, or see the full profile on X."}
                  </p>
                  {query && (
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setQuery("")}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
            {feed && (
              <footer className={styles.feedFooter}>
                {feed.nextCursor && (
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    className={styles.secondary}
                    onClick={() => {
                      void loadMore();
                    }}
                  >
                    {busy === "more"
                      ? "Loading older posts…"
                      : "Load older posts"}
                  </button>
                )}
                <p>
                  {feed.limitReached ? "Showing up to 100 recent posts. " : ""}
                  {source === "saved"
                    ? `Saved selection · ${dateLabel(feed.fetchedAt)} · Not a live feed.`
                    : `Updated ${dateLabel(feed.fetchedAt)} · Cached for up to 15 minutes.`}
                </p>
                <a
                  href={X_PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  See the full timeline on X <Icon name="arrow" />
                </a>
              </footer>
            )}
          </main>
          <aside className={styles.sidebar} aria-label="About this X showcase">
            <section className={styles.sideCard}>
              <span className={styles.eyebrow}>ONE PROFILE. LESS NOISE.</span>
              <h2>
                A window into
                <br />
                what I’m sharing.
              </h2>
              <p>
                Browse public posts from @{X_HANDLE} without leaving the
                desktop.
              </p>
              <a
                className={styles.sideLink}
                href={X_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Explore on X <Icon name="arrow" />
              </a>
            </section>
            <section className={styles.sideCard}>
              <h3>Made for reading</h3>
              <p>
                This is a read-only portfolio app, not an X login. Replies,
                reposts, and likes happen on X—not in your browser session here.
              </p>
              <div className={styles.connection}>
                <span data-connected={Boolean(feed)} />
                {feed
                  ? source === "saved"
                    ? "Saved on this website"
                    : "Retrieved through the server"
                  : busy
                    ? "Loading public posts"
                    : "Awaiting a published selection"}
              </div>
            </section>
            <p className={styles.disclaimer}>
              Original posts, with links back to X. Saved selections are dated,
              not presented as live. Reposts are excluded. No generated or
              sample posts appear in this feed.
            </p>
          </aside>
        </div>
      </div>
      <span className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </div>
  );
}
