// Deterministic test content only. Never import this fixture into application code.
import type { XFeed, XPost } from "../../utils/x-profile";
export const rawXProfile = {
  data: {
    id: "12345",
    name: "Alex Unnippillil",
    username: "AUnnippillil",
    protected: false,
    description: "Test profile fixture — not live account data.",
    profile_image_url: "https://pbs.twimg.com/profile_images/fixture.jpg",
    created_at: "2010-09-01T00:00:00Z",
    location: "Canada",
    public_metrics: {
      followers_count: 1200,
      following_count: 123,
      post_count: 42,
    },
    url: "https://www.unnippillil.com/",
  },
};
export const makeXPost = (
  id: string,
  text: string,
  extra: Partial<XPost> = {},
): XPost => ({
  id,
  text,
  createdAt: "2026-09-18T12:00:00Z",
  sensitive: false,
  urls: [],
  media: [],
  metrics: { replies: 2, reposts: 3, likes: 12 },
  ...extra,
});
export const xFeedFixture: XFeed = {
  profile: {
    id: "12345",
    name: "Alex Unnippillil",
    username: "AUnnippillil",
    description: "Test profile fixture — not live account data.",
    location: "Canada",
    website: "https://www.unnippillil.com/",
    joined: "2010-09-01T00:00:00Z",
    avatar: "https://pbs.twimg.com/profile_images/fixture.jpg",
    followers: 1200,
    following: 123,
    posts: 42,
  },
  posts: [
    makeXPost(
      "1001",
      "Fixture: building an accessible engineering portfolio. A desktop that works with touch, mouse, and keyboard. Read the project notes: https://t.co/fixture",
      {
        urls: [
          {
            url: "https://t.co/fixture",
            expanded: "https://www.unnippillil.com/",
            label: "unnippillil.com",
          },
        ],
        media: [
          {
            key: "photo1",
            type: "photo",
            src: "https://pbs.twimg.com/media/fixture.jpg",
            alt: "Deterministic browser fixture: engineering interface",
          },
        ],
      },
    ),
    makeXPost(
      "1002",
      "Fixture: thanks for the thoughtful discussion about security.",
      { replyTo: "9001" },
    ),
    makeXPost(
      "1003",
      "Fixture: a longer technical note. " +
        "Accessible interfaces preserve focus and user input. ".repeat(18),
    ),
    makeXPost("1004", "Fixture: short walkthrough video.", {
      media: [
        {
          key: "video1",
          type: "video",
          src: "https://pbs.twimg.com/media/video-fixture.jpg",
          alt: "Test video preview",
        },
      ],
    }),
  ],
  fetchedAt: "2026-09-18T12:01:00Z",
  nextCursor: "fixture-cursor-2",
  limitReached: false,
};
