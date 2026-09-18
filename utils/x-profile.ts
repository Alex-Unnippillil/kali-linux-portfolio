import { z } from "zod";

// This is a portfolio showcase, not an arbitrary-account API proxy.
export const X_HANDLE = "AUnnippillil";
export const X_PROFILE_URL = `https://x.com/${X_HANDLE}`;
export const xPostUrl = (id: string) =>
  `https://x.com/${X_HANDLE}/status/${id}`;
const id = z.string().regex(/^\d{1,19}$/);
const count = z.number().int().nonnegative().optional();

export function safeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 4096) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function safeXImage(value: unknown): string | undefined {
  const safe = safeExternalUrl(value);
  if (!safe) return undefined;
  const url = new URL(safe);
  return url.protocol === "https:" &&
    ["pbs.twimg.com", "abs.twimg.com"].includes(url.hostname)
    ? safe
    : undefined;
}
const link = z.string().refine((value) => safeExternalUrl(value) === value);
const image = z.string().refine((value) => safeXImage(value) === value);
export const XProfileSchema = z.object({
  id,
  username: z.literal(X_HANDLE),
  name: z.string().max(100),
  description: z.string().max(2000),
  avatar: image.optional(),
  banner: image.optional(),
  location: z.string().max(200).optional(),
  website: link.optional(),
  joined: z.string().datetime().optional(),
  followers: count,
  following: count,
  posts: count,
});
export const XPostSchema = z.object({
  id,
  text: z.string().max(30000),
  createdAt: z.string().datetime().optional(),
  replyTo: id.optional(),
  quoteId: id.optional(),
  sensitive: z.boolean(),
  urls: z
    .array(
      z.object({
        url: z.string().max(4096),
        expanded: link,
        label: z.string().max(4096),
      }),
    )
    .max(100),
  media: z
    .array(
      z.object({
        key: z.string().max(100),
        type: z.enum(["photo", "video", "animated_gif"]),
        src: image,
        alt: z.string().max(2000),
      }),
    )
    .max(4),
  metrics: z.object({ replies: count, reposts: count, likes: count }),
});
export const XFeedSchema = z.object({
  profile: XProfileSchema,
  posts: z.array(XPostSchema).max(100),
  fetchedAt: z.string().datetime(),
  nextCursor: z.string().max(2048).optional(),
  limitReached: z.boolean(),
});
export type XProfile = z.infer<typeof XProfileSchema>;
export type XPost = z.infer<typeof XPostSchema>;
export type XFeed = z.infer<typeof XFeedSchema>;
export type FeedIssue =
  | "not_configured"
  | "unavailable"
  | "rate_limited"
  | "timeout"
  | "invalid_cursor"
  | "offline"
  | "static_export";
export type PostFilter = "posts" | "replies" | "media";

// API responses are untrusted, including optional fields and current/legacy names.
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const text = (value: unknown, limit = 30000): string =>
  typeof value === "string" ? value.slice(0, limit) : "";
const numeric = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
const postId = (value: unknown) =>
  typeof value === "string" && /^\d{1,19}$/.test(value) ? value : undefined;
const date = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export function normalizeXProfile(payload: unknown): XProfile | null {
  const user = record(record(payload).data);
  // Fail closed: a user-context token must never publish a protected profile.
  if (
    text(user.username).toLowerCase() !== X_HANDLE.toLowerCase() ||
    user.protected !== false ||
    user.withheld
  )
    return null;
  const metrics = record(user.public_metrics);
  const urls = array(record(record(user.entities).url).urls).map(record);
  const result = XProfileSchema.safeParse({
    id: user.id,
    username: X_HANDLE,
    name: text(user.name, 100) || X_HANDLE,
    description: text(user.description, 2000),
    avatar: safeXImage(user.profile_image_url),
    banner: safeXImage(user.profile_banner_url),
    location: text(user.location, 200) || undefined,
    website: safeExternalUrl(urls[0]?.expanded_url || user.url),
    joined: date(user.created_at),
    followers: numeric(metrics.followers_count),
    following: numeric(metrics.following_count),
    posts: numeric(metrics.post_count ?? metrics.tweet_count),
  });
  return result.success ? result.data : null;
}

export function normalizeXPosts(payload: unknown, ownerId: string): XPost[] {
  const body = record(payload);
  const media = new Map(
    array(record(body.includes).media).map((item) => {
      const entry = record(item);
      return [text(entry.media_key), entry];
    }),
  );
  const seen = new Set<string>();
  return array(body.data)
    .slice(0, 100)
    .flatMap((value) => {
      const post = record(value);
      const key = postId(post.id);
      const references = array(
        post.referenced_posts ?? post.referenced_tweets,
      ).map(record);
      if (
        !key ||
        seen.has(key) ||
        post.author_id !== ownerId ||
        post.withheld ||
        references.some((ref) =>
          ["retweeted", "reposted"].includes(text(ref.type)),
        )
      )
        return [];
      const note = record(post.note_post ?? post.note_tweet);
      const content = text(note.text || post.text);
      if (!content) return [];
      const entities = record(note.text ? note.entities : post.entities);
      const metrics = record(post.public_metrics);
      const result = XPostSchema.safeParse({
        id: key,
        text: content,
        createdAt: date(post.created_at),
        sensitive: post.possibly_sensitive === true,
        replyTo: postId(
          references.find((ref) => ref.type === "replied_to")?.id,
        ),
        quoteId: postId(references.find((ref) => ref.type === "quoted")?.id),
        urls: array(entities.urls)
          .slice(0, 100)
          .flatMap((value) => {
            const entity = record(value);
            const expanded = safeExternalUrl(entity.expanded_url ?? entity.url);
            return expanded && typeof entity.url === "string"
              ? [
                  {
                    url: text(entity.url, 4096),
                    expanded,
                    label: text(entity.display_url, 4096) || expanded,
                  },
                ]
              : [];
          }),
        media: array(record(post.attachments).media_keys)
          .slice(0, 4)
          .flatMap((value) => {
            const item = media.get(text(value));
            if (
              !item ||
              !["photo", "video", "animated_gif"].includes(text(item.type))
            )
              return [];
            const src = safeXImage(
              item.type === "photo" ? item.url : item.preview_image_url,
            );
            return src
              ? [
                  {
                    key: text(value, 100),
                    type: item.type,
                    src,
                    alt:
                      text(item.alt_text, 2000) ||
                      (item.type === "photo"
                        ? "Photo attached to this post"
                        : "Video preview; watch the original on X"),
                  },
                ]
              : [];
          }),
        metrics: {
          replies: numeric(metrics.reply_count),
          reposts: numeric(metrics.repost_count ?? metrics.retweet_count),
          likes: numeric(metrics.like_count),
        },
      });
      if (!result.success) return [];
      seen.add(key);
      return [result.data];
    });
}

export function filterXPosts(
  posts: XPost[],
  filter: PostFilter,
  query: string,
): XPost[] {
  const q = query.trim().toLocaleLowerCase();
  return posts.filter(
    (post) =>
      (filter === "posts"
        ? !post.replyTo
        : filter === "replies"
          ? Boolean(post.replyTo)
          : post.media.length > 0) &&
      (!q || post.text.toLocaleLowerCase().includes(q)),
  );
}

export function postTextParts(
  post: XPost,
): Array<{ text: string; href?: string }> {
  // Text is rendered as React nodes, never as HTML. Ignore untrusted entity offsets.
  const matches = [...post.text.matchAll(/https?:\/\/[^\s<>]+/g)];
  const parts: Array<{ text: string; href?: string }> = [];
  let offset = 0;
  for (const match of matches) {
    const start = match.index ?? 0;
    parts.push({ text: post.text.slice(offset, start) });
    const entity = post.urls.find((url) => url.url === match[0]);
    parts.push({
      text: entity?.label || match[0],
      href: safeExternalUrl(entity?.expanded || match[0]),
    });
    offset = start + match[0].length;
  }
  parts.push({ text: post.text.slice(offset) });
  return parts;
}
