import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import SmartImage from "../components/ui/SmartImage";

describe("SmartImage", () => {
  it("applies high priority and eager loading for critical images", () => {
    render(<SmartImage src="/hero.webp" alt="hero" importance="critical" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("fetchpriority", "high");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("marks LCP imagery with a data attribute", () => {
    render(<SmartImage src="/wall.webp" alt="wall" lcp />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("data-lcp-image", "true");
  });

  it("uses responsive sizes based on viewport heuristics", async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 540;
    render(<SmartImage src="/mobile.webp" alt="mobile" />);
    const img = screen.getByRole("img");
    await waitFor(() => {
      expect(img).toHaveAttribute("sizes", "100vw");
    });
    window.innerWidth = originalWidth;
  });

  it("falls back gracefully when rendered without a browser window", () => {
    const originalWindow = global.window as Window | undefined;
    // @ts-expect-error intentionally removing the window object
    delete (global as any).window;
    const markup = renderToStaticMarkup(
      <SmartImage src="/ssr.webp" alt="ssr" importance="standard" />
    );
    expect(markup).toContain("loading=\"lazy\"");
    (global as any).window = originalWindow;
  });
});
