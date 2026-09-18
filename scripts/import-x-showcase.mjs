/** Owner-only import. Parses an exported X archive as DATA, never executes archive JavaScript. */
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  XFeedSchema,
  X_HANDLE,
  X_PROFILE_URL,
  safeExternalUrl,
} from "../utils/x-profile.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_INPUT = 64 * 1024 * 1024;
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_MEDIA = 40 * 1024 * 1024;
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value, max = 30000) =>
  typeof value === "string" ? value.slice(0, max) : "";
const id = (value) =>
  typeof value === "string" && /^\d{1,19}$/.test(value) ? value : undefined;
const count = (value) =>
  /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : undefined;
const decode = (value) =>
  value.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (item) =>
      ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" })[
        item
      ],
  );

export function parseArchiveData(input, kind) {
  let body = input.trim().replace(/^\uFEFF/, "");
  const prefix = new RegExp(`^window\\.YTD\\.${kind}\\.part\\d+\\s*=\\s*`);
  if (prefix.test(body)) body = body.replace(prefix, "").replace(/;\s*$/, "");
  const data = JSON.parse(body);
  if (!Array.isArray(data))
    throw new Error(`Expected an array in ${kind} archive data`);
  return data;
}
async function readArchive(filename, kind) {
  const stat = await lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_INPUT)
    throw new Error(`Invalid or oversized ${kind} input`);
  const buffer = await readFile(filename);
  if (!Buffer.from(buffer.toString("utf8"), "utf8").equals(buffer))
    throw new Error(`Invalid UTF-8 in ${kind} input`);
  return parseArchiveData(buffer.toString("utf8"), kind);
}
export function feedFromArchive(
  accounts,
  tweets,
  capturedAt = new Date().toISOString(),
  selectedIds,
) {
  if (accounts.length !== 1) throw new Error("Expected one archive account");
  const account = object(object(accounts[0]).account);
  if (
    text(account.username).toLowerCase() !== X_HANDLE.toLowerCase() ||
    !id(account.accountId)
  )
    throw new Error(`The archive must belong to @${X_HANDLE}`);
  const seen = new Set();
  const posts = tweets
    .flatMap((entry) => {
      const tweet = object(object(entry).tweet);
      const postId = id(tweet.id_str);
      const content = decode(text(tweet.full_text || tweet.text));
      if (
        !postId ||
        seen.has(postId) ||
        !content ||
        /^RT @/.test(content) ||
        tweet.retweeted_status ||
        tweet.withheld ||
        tweet.withheld_in_countries?.length
      )
        return [];
      if (tweet.user_id_str && tweet.user_id_str !== account.accountId)
        return [];
      if (selectedIds && !selectedIds.has(postId)) return [];
      const date = new Date(tweet.created_at);
      if (!Number.isFinite(date.getTime()))
        throw new Error("An included post has an invalid date");
      seen.add(postId);
      const urls = Array.isArray(tweet.entities?.urls)
        ? tweet.entities.urls
        : [];
      return [
        {
          id: postId,
          text: content,
          createdAt: date.toISOString(),
          replyTo: id(tweet.in_reply_to_status_id_str),
          quoteId: id(tweet.quoted_status_id_str),
          sensitive: tweet.possibly_sensitive === true,
          urls: urls.slice(0, 100).flatMap((url) => {
            const expanded = safeExternalUrl(url.expanded_url);
            return expanded
              ? [
                  {
                    url: text(url.url, 4096),
                    expanded,
                    label: text(url.display_url || expanded, 4096),
                  },
                ]
              : [];
          }),
          media: [],
          metrics: {
            likes: count(tweet.favorite_count),
            reposts: count(tweet.retweet_count),
          },
        },
      ];
    })
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        (BigInt(a.id) > BigInt(b.id) ? -1 : 1),
    );
  if (selectedIds && [...selectedIds].some((value) => !seen.has(value)))
    throw new Error(
      "One or more selected IDs are absent, duplicated, withheld, or reposts",
    );
  if (!posts.length)
    throw new Error(
      "No eligible original posts were found; existing snapshot is unchanged",
    );
  return XFeedSchema.parse({
    profile: {
      id: account.accountId,
      username: X_HANDLE,
      name: text(account.accountDisplayName, 100) || "Alex Unnippillil",
      description: "",
    },
    posts: posts.slice(0, 100),
    fetchedAt: capturedAt,
    limitReached: posts.length > 100,
  });
}
export function imageExtension(buffer) {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return "jpg";
  if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii"))) return "gif";
  if (
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "webp";
  return undefined;
}
export async function importXArchive({
  accountFile,
  tweetsFile,
  mediaDirectory,
  selectedIds,
  root = ROOT,
  capturedAt,
}) {
  const accounts = await readArchive(accountFile, "account");
  const tweets = await readArchive(tweetsFile, "tweets");
  const feed = feedFromArchive(accounts, tweets, capturedAt, selectedIds);
  const mediaAssets = new Map();
  let mediaBytes = 0;
  // Optional archive photos only; missing previews are omitted rather than fetched from third parties.
  if (mediaDirectory) {
    const mediaRoot = await realpath(mediaDirectory);
    const originals = new Map(
      tweets.map((entry) => [entry.tweet?.id_str, entry.tweet]),
    );
    for (const post of feed.posts) {
      const raw = originals.get(post.id);
      for (const item of (
        raw?.extended_entities?.media ||
        raw?.entities?.media ||
        []
      ).slice(0, 4)) {
        let basename;
        try {
          basename = path.basename(new URL(item.media_url_https).pathname);
        } catch {
          continue;
        }
        if (!/^[a-zA-Z0-9_.-]{1,150}$/.test(basename)) continue;
        const filename = path.join(mediaRoot, `${post.id}-${basename}`);
        let stat;
        try {
          stat = await lstat(filename);
        } catch {
          continue;
        }
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_IMAGE)
          continue;
        const buffer = await readFile(filename);
        const extension = imageExtension(buffer);
        if (!extension) continue;
        mediaBytes += buffer.length;
        if (mediaBytes > MAX_MEDIA)
          throw new Error(
            "Media exceeds the 40 MiB import budget; reduce the selection",
          );
        const filenameOut = `${createHash("sha256").update(buffer).digest("hex")}.${extension}`;
        mediaAssets.set(filenameOut, buffer);
        post.media.push({
          key: id(item.id_str) || filenameOut,
          type: ["video", "animated_gif"].includes(item.type)
            ? item.type
            : "photo",
          src: `/showcase/x-media/${filenameOut}`,
          alt: text(item.ext_alt_text, 2000) || "Image from the original post",
        });
      }
    }
  }
  const validated = XFeedSchema.parse(feed);
  await mkdir(path.join(root, "data"), { recursive: true });
  await mkdir(path.join(root, "public/showcase/x-media"), { recursive: true });
  for (const [name, buffer] of mediaAssets)
    await writeFile(path.join(root, "public/showcase/x-media", name), buffer);
  const destination = path.join(root, "data/x-profile-snapshot.json");
  await writeFile(
    `${destination}.tmp`,
    `${JSON.stringify({ version: 1, source: X_PROFILE_URL, feed: validated }, null, 2)}\n`,
  );
  await rename(`${destination}.tmp`, destination);
  return validated;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const value = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const accountFile = value("--account");
  const tweetsFile = value("--tweets");
  if (!accountFile || !tweetsFile || !args.includes("--publish-reviewed")) {
    console.error(
      "Usage: yarn x:import --account /private/archive/data/account.js --tweets /private/archive/data/tweets.js --publish-reviewed [--media /private/archive/data/tweets_media] [--ids 123,456]",
    );
    console.error(
      "Review this public selection before importing. Never commit your raw archive or private account data.",
    );
    process.exitCode = 1;
  } else {
    try {
      const selectedIds = value("--ids")
        ? new Set(value("--ids").split(","))
        : undefined;
      const feed = await importXArchive({
        accountFile,
        tweetsFile,
        mediaDirectory: value("--media"),
        selectedIds,
      });
      console.log(
        `Prepared ${feed.posts.length} original posts from @${X_HANDLE}. Review data/x-profile-snapshot.json and its local media before committing.`,
      );
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : "Archive import failed",
      );
      process.exitCode = 1;
    }
  }
}
