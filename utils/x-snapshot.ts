import { z } from "zod";
import { XFeedSchema, X_PROFILE_URL } from "./x-profile";

/** An empty archive is explicit. Never fill this with test posts or invented account content. */
export const XSnapshotSchema = z
  .object({
    version: z.literal(1),
    source: z.literal(X_PROFILE_URL),
    feed: XFeedSchema.nullable(),
  })
  .superRefine(({ feed }, ctx) => {
    if (!feed) return;
    if (feed.nextCursor)
      ctx.addIssue({
        code: "custom",
        message: "Saved selections must not contain an expiring API cursor",
      });
    const ids = new Set<string>();
    for (const post of feed.posts) {
      if (ids.has(post.id))
        ctx.addIssue({
          code: "custom",
          message: "Saved post IDs must be unique",
        });
      ids.add(post.id);
    }
    for (const image of [
      feed.profile.avatar,
      feed.profile.banner,
      ...feed.posts.flatMap((post) => post.media.map((item) => item.src)),
    ]) {
      if (image && !image.startsWith("/showcase/x-media/"))
        ctx.addIssue({
          code: "custom",
          message: "Saved images must be first-party assets",
        });
    }
  });
export function readXSnapshot(value: unknown) {
  const parsed = XSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data.feed : null;
}
