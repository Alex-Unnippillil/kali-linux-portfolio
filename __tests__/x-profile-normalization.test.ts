import {
  normalizeXPosts,
  normalizeXProfile,
  filterXPosts,
  postTextParts,
  safeExternalUrl,
  safeXImage,
  XFeedSchema,
} from "../utils/x-profile";
import {
  rawXProfile,
  xFeedFixture,
  makeXPost,
} from "../tests/fixtures/x-profile";

describe("public X profile normalization", () => {
  it("uses public fields without inventing verification or missing counts", () => {
    const profile = normalizeXProfile(rawXProfile)!;
    expect(profile.username).toBe("AUnnippillil");
    expect(profile.posts).toBe(42);
    expect(profile).not.toHaveProperty("verified");
    const legacy = normalizeXProfile({
      data: { ...rawXProfile.data, public_metrics: { tweet_count: 5 } },
    })!;
    expect(legacy.posts).toBe(5);
    expect(legacy.followers).toBeUndefined();
  });
  it.each([
    null,
    {},
    { data: { ...rawXProfile.data, protected: true } },
    { data: { ...rawXProfile.data, protected: undefined } },
    { data: { ...rawXProfile.data, username: "someone_else" } },
    { data: { ...rawXProfile.data, withheld: {} } },
  ])("refuses private, different, or invalid profiles (%j)", (payload) => {
    expect(normalizeXProfile(payload)).toBeNull();
  });
  it("normalizes optional malformed fields and rejects credential-bearing URLs", () => {
    const profile = normalizeXProfile({
      data: {
        ...rawXProfile.data,
        location: 23,
        url: "javascript:alert(1)",
        created_at: "bad date",
        profile_image_url: "https://evil.example/photo",
      },
    })!;
    expect(profile.location).toBeUndefined();
    expect(profile.website).toBeUndefined();
    expect(profile.joined).toBeUndefined();
    expect(profile.avatar).toBeUndefined();
    expect(safeExternalUrl("https://user:secret@example.com/")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,test")).toBeUndefined();
    expect(safeXImage("https://pbs.twimg.com.evil.example/a")).toBeUndefined();
    expect(safeXImage("http://pbs.twimg.com/a")).toBeUndefined();
  });
});
const rawPost = {
  id: "100",
  author_id: "12345",
  text: "Basic post",
  created_at: "2026-09-01T12:00:00Z",
};
describe("X posts and media", () => {
  it.each(["post", "tweet"])(
    "reads the %s field dialect and long-form text",
    (dialect) => {
      const posts = normalizeXPosts(
        {
          data: [
            {
              ...rawPost,
              [`note_${dialect}`]: {
                text: "Long-form 🚀 https://t.co/abc",
                entities: {
                  urls: [
                    {
                      url: "https://t.co/abc",
                      expanded_url: "https://example.com/read",
                      display_url: "example.com/read",
                    },
                  ],
                },
              },
              [`referenced_${dialect}s`]: [{ type: "replied_to", id: "99" }],
              public_metrics: {
                [dialect === "post" ? "repost_count" : "retweet_count"]: 6,
              },
            },
          ],
        },
        "12345",
      );
      expect(posts[0].text).toContain("Long-form 🚀");
      expect(posts[0].replyTo).toBe("99");
      expect(posts[0].metrics.reposts).toBe(6);
      expect(posts[0].urls[0].expanded).toBe("https://example.com/read");
    },
  );
  it("drops other authors, withheld content, reposts, duplicates, invalid ids, and empty text", () => {
    const posts = normalizeXPosts(
      {
        data: [
          rawPost,
          rawPost,
          { ...rawPost, id: "101", author_id: "987" },
          { ...rawPost, id: "102", withheld: {} },
          { ...rawPost, id: "103", referenced_posts: [{ type: "reposted" }] },
          { ...rawPost, id: "104", referenced_tweets: [{ type: "retweeted" }] },
          { ...rawPost, id: "105", text: "" },
          { ...rawPost, id: "../test" },
        ],
      },
      "12345",
    );
    expect(posts.map((post) => post.id)).toEqual(["100"]);
  });
  it("allows only X-hosted media, handles preview images and sensitive flags, and strips unsafe links", () => {
    const posts = normalizeXPosts(
      {
        data: [
          {
            ...rawPost,
            possibly_sensitive: true,
            attachments: { media_keys: ["a", "b", "c"] },
            entities: {
              urls: [{ url: "bad", expanded_url: "javascript:alert(1)" }],
            },
            public_metrics: { like_count: -1, reply_count: "12" },
          },
        ],
        includes: {
          media: [
            {
              media_key: "a",
              type: "photo",
              url: "https://pbs.twimg.com/a",
              alt_text: "A photograph",
            },
            {
              media_key: "b",
              type: "video",
              preview_image_url: "https://pbs.twimg.com/b",
            },
            { media_key: "c", type: "photo", url: "https://evil.example/c" },
          ],
        },
      },
      "12345",
    );
    expect(posts[0].sensitive).toBe(true);
    expect(posts[0].media).toHaveLength(2);
    expect(posts[0].urls).toEqual([]);
    expect(posts[0].metrics.likes).toBeUndefined();
  });
  it("filters loaded posts without mixing replies or fetching a search endpoint", () => {
    expect(
      filterXPosts(xFeedFixture.posts, "posts", "").map((p) => p.id),
    ).toEqual(["1001", "1003", "1004"]);
    expect(
      filterXPosts(xFeedFixture.posts, "replies", "SECURITY").map((p) => p.id),
    ).toEqual(["1002"]);
    expect(
      filterXPosts(xFeedFixture.posts, "media", "").map((p) => p.id),
    ).toEqual(["1001", "1004"]);
  });
  it("renders unsafe HTML as text and expands only safe exact URL entities", () => {
    const post = makeXPost("1", "<script>evil()</script> Read https://t.co/a", {
      urls: [
        {
          url: "https://t.co/a",
          expanded: "https://example.com/",
          label: "example.com",
        },
      ],
    });
    const parts = postTextParts(post);
    expect(parts[0].text).toContain("<script>");
    expect(parts[1]).toEqual({
      text: "example.com",
      href: "https://example.com/",
    });
    expect(XFeedSchema.safeParse(xFeedFixture).success).toBe(true);
    expect(
      XFeedSchema.safeParse({
        ...xFeedFixture,
        profile: { ...xFeedFixture.profile, avatar: "javascript:evil()" },
      }).success,
    ).toBe(false);
  });
});
