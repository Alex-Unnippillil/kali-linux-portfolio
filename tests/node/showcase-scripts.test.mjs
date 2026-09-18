import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  generateRepositorySnapshot,
  isPublicSource,
} from "../../scripts/generate-repository-snapshot.mjs";
import {
  parseArchiveData,
  feedFromArchive,
  importXArchive,
  imageExtension,
} from "../../scripts/import-x-showcase.mjs";

const account = [
  {
    account: {
      username: "AUnnippillil",
      accountId: "12345",
      accountDisplayName: "Archive test fixture",
      email: "private-must-not-publish@example.test",
    },
  },
];
const tweet = (id, full_text = "Archive test fixture only") => ({
  tweet: {
    id_str: id,
    full_text,
    created_at: "Fri Sep 18 12:00:00 +0000 2026",
    favorite_count: "2",
    retweet_count: "3",
  },
});
const temp = () => mkdtemp(path.join(tmpdir(), "showcase-test-"));

test("generator publishes only bounded tracked public source, excludes secrets and symlinks, and hashes real contents", async () => {
  const root = await temp();
  try {
    execFileSync("git", ["init", "-q", root]);
    await mkdir(path.join(root, "apps"), { recursive: true });
    await mkdir(path.join(root, "public"), { recursive: true });
    for (const [name, body] of Object.entries({
      "README.md": "# Real source fixture",
      "apps/demo.ts": "export const value = 42;",
      ".env.local": "DO_NOT_EXPORT=secret",
      "untracked.ts": "not tracked",
      "public/data.json": "private fixture",
      "large.ts": "a".repeat(262145),
      "invalid.ts": Buffer.from([255, 0, 255]),
    }))
      await writeFile(path.join(root, name), body);
    await symlink(".env.local", path.join(root, "symlink.ts"));
    execFileSync(
      "git",
      [
        "add",
        "README.md",
        "apps/demo.ts",
        ".env.local",
        "public/data.json",
        "large.ts",
        "invalid.ts",
        "symlink.ts",
      ],
      { cwd: root },
    );
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.test",
        "commit",
        "-qm",
        "fixture",
      ],
      { cwd: root },
    );
    const result = await generateRepositorySnapshot(root);
    assert.deepEqual(
      result.files.map((file) => file.path),
      ["README.md", "apps/demo.ts"],
    );
    for (const file of result.files) {
      const payload = await readFile(
        path.join(
          root,
          "public/showcase/repository/files",
          `${file.asset}.json`,
        ),
      );
      assert.equal(
        createHash("sha256").update(payload).digest("hex"),
        file.asset,
      );
      assert.equal(
        JSON.parse(payload).content,
        await readFile(path.join(root, file.path), "utf8"),
      );
    }
    assert.equal(
      result.revision,
      execFileSync("git", ["rev-parse", "HEAD"], { cwd: root })
        .toString()
        .trim(),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("source policy rejects private key files, traversal, generated fixtures and archive content", () => {
  for (const value of [
    ".env",
    ".env.example",
    "keys/cert.pem",
    "keys/id_rsa",
    "config/secrets.json",
    "node_modules/pkg/index.ts",
    "../private.ts",
    "/private.ts",
    "x\\secret.ts",
    "data/x-profile-snapshot.json",
    "qa/payload.ts",
    "tests/fixtures/x-profile.ts",
  ])
    assert.equal(isPublicSource(value), false, value);
  assert.equal(isPublicSource("apps/vscode/index.tsx"), true);
});
test("archive parser accepts only arrays or X export assignments and never evaluates JavaScript", () => {
  assert.deepEqual(
    parseArchiveData(
      `window.YTD.tweets.part0 = ${JSON.stringify([tweet("1")])};`,
      "tweets",
    ),
    [tweet("1")],
  );
  assert.throws(() =>
    parseArchiveData(
      'window.YTD.tweets.part0 = (() => { throw new Error("execute"); })()',
      "tweets",
    ),
  );
  assert.throws(() =>
    parseArchiveData('{"direct_messages":"private"}', "tweets"),
  );
});
test("archive preserves original text/IDs and excludes reposts, other authors, withheld and duplicate entries", () => {
  const other = tweet("3");
  other.tweet.user_id_str = "99999";
  const withheld = tweet("4");
  withheld.tweet.withheld = true;
  const result = feedFromArchive(account, [
    tweet("1", "Original &amp; literal &lt;tag&gt;"),
    tweet("1"),
    tweet("2", "RT @someone: repost"),
    other,
    withheld,
  ]);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0].text, "Original & literal <tag>");
  assert.equal(result.posts[0].id, "1");
  assert.equal(
    JSON.stringify(result).includes("private-must-not-publish"),
    false,
  );
  assert.equal(result.posts[0].metrics.likes, 2);
  assert.throws(() =>
    feedFromArchive(
      [{ account: { ...account[0].account, username: "someoneelse" } }],
      [tweet("1")],
    ),
  );
  assert.throws(() =>
    feedFromArchive(account, [tweet("1")], undefined, new Set(["9"])),
  );
});
test("archive importer writes a first-party snapshot only after successful validation", async () => {
  const root = await temp();
  try {
    const accountFile = path.join(root, "account.js");
    const tweetsFile = path.join(root, "tweets.js");
    await writeFile(
      accountFile,
      `window.YTD.account.part0 = ${JSON.stringify(account)}`,
    );
    await writeFile(
      tweetsFile,
      `window.YTD.tweets.part0 = ${JSON.stringify([tweet("1")])}`,
    );
    const feed = await importXArchive({ accountFile, tweetsFile, root });
    const saved = await readFile(
      path.join(root, "data/x-profile-snapshot.json"),
      "utf8",
    );
    assert.equal(JSON.parse(saved).feed.posts[0].text, feed.posts[0].text);
    await writeFile(tweetsFile, "not valid");
    await assert.rejects(importXArchive({ accountFile, tweetsFile, root }));
    assert.equal(
      await readFile(path.join(root, "data/x-profile-snapshot.json"), "utf8"),
      saved,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("archive import is bounded to 100 originals and never passes SVG or HTML as media", () => {
  assert.equal(
    feedFromArchive(
      account,
      Array.from({ length: 101 }, (_, index) => tweet(String(index + 1))),
    ).posts.length,
    100,
  );
  assert.equal(
    imageExtension(Buffer.from('<svg onload="alert(1)"></svg>')),
    undefined,
  );
  assert.equal(imageExtension(Buffer.from("<html>error</html>")), undefined);
  assert.equal(
    imageExtension(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "png",
  );
});
