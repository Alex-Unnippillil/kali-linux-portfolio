import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import EmbedFrame from "../components/EmbedFrame";
const src = "https://www.youtube-nocookie.com/embed/shared00001?playsinline=1";
const watch = "https://www.youtube.com/watch?v=shared00001";
test("the main YouTube embed loads eagerly without an overlay covering its controls", () => {
  render(
    <EmbedFrame
      src={src}
      title="Selected video"
      showExternalLink={false}
      loading="eager"
      externalUrl={watch}
    />,
  );
  const frame = screen.getByTitle("Selected video");
  expect(frame).toHaveAttribute("loading", "eager");
  expect(frame).toHaveAttribute(
    "referrerpolicy",
    "strict-origin-when-cross-origin",
  );
  expect(frame).toHaveAttribute("allowfullscreen");
  fireEvent.load(frame);
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
test("a failed embed offers the canonical watch URL, not the failed iframe URL", () => {
  jest.useFakeTimers();
  try {
    render(
      <EmbedFrame
        src={src}
        title="Selected video"
        showExternalLink={false}
        externalUrl={watch}
        timeoutMs={1000}
        fallbackLabel="Open on YouTube"
      />,
    );
    act(() => jest.advanceTimersByTime(1001));
    expect(
      screen.getByRole("link", { name: "Open on YouTube" }),
    ).toHaveAttribute("href", watch);
  } finally {
    jest.useRealTimers();
  }
});
test("other embedded apps keep their existing external-link control by default", () => {
  render(<EmbedFrame src={src} title="Other embed" />);
  fireEvent.load(screen.getByTitle("Other embed"));
  expect(screen.getByRole("link", { name: "Open in new tab" })).toHaveAttribute(
    "href",
    src,
  );
});
