import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import XProfileApp from "../apps/x";
import snapshot from "../data/x-profile-snapshot.json";
import provenance from "../data/x-profile-provenance.json";
import { XSnapshotSchema } from "../utils/x-snapshot";

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_STATIC_EXPORT;
});

it("ships a populated fixed-account snapshot with per-post provenance, not fixtures", () => {
  const feed = XSnapshotSchema.parse(snapshot).feed!;
  expect(feed.profile.id).toBe("185897765");
  expect(feed.profile.username).toBe("AUnnippillil");
  expect(feed.posts).toHaveLength(18);
  expect(feed.posts.map((post) => post.id)).toEqual(
    provenance.posts.map((post) => post.id),
  );
  expect(feed.posts[0].id).toBe("2022722108921610324");
  expect(feed.posts[0].text).toBe(
    "Awesome! I was among the first 1,000 people to solve OpenAI's Super Bowl Ad Codex Challenge!",
  );
  expect(
    feed.posts.every((post) => Boolean(post.text || post.media.length)),
  ).toBe(true);
  expect(
    feed.posts.some((post) => /Fixture:|test fixture/i.test(post.text)),
  ).toBe(false);
  expect(feed.nextCursor).toBeUndefined();
});

it("ships every saved image locally with an intact content hash", () => {
  const feed = XSnapshotSchema.parse(snapshot).feed!;
  const images = new Set(
    [
      feed.profile.avatar,
      feed.profile.banner,
      ...feed.posts.flatMap((post) => post.media.map((media) => media.src)),
    ].filter(Boolean),
  );
  expect(images.size).toBe(5);
  for (const asset of images) {
    expect(asset).toMatch(
      /^\/showcase\/x-media\/[a-f0-9]{64}\.(png|jpg|gif|webp)$/,
    );
    const bytes = readFileSync(path.join(__dirname, "../public", asset!));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      path.basename(asset!).split(".")[0],
    );
  }
});

it.each([false, true])(
  "opens the actual saved posts with no API, consent or login (static=%s)",
  (isStatic) => {
    process.env.NEXT_PUBLIC_STATIC_EXPORT = String(isStatic);
    const request = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("No external services"));
    const { container } = render(<XProfileApp />);
    expect(
      screen.getByText(/Awesome! I was among the first 1,000 people/),
    ).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(17);
    expect(
      screen.queryByRole("button", { name: "Refresh posts" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Enable network")).not.toBeInTheDocument();
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Media", exact: true }));
    expect(screen.getAllByRole("article")).toHaveLength(3);
    fireEvent.click(
      screen.getByRole("button", { name: "Replies", exact: true }),
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByText(/I still want to keep tabs on reality/),
    ).toBeVisible();
    expect(request).not.toHaveBeenCalled();
  },
);
