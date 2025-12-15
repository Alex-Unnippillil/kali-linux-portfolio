import { buildWindowPreviewFallbackDataUrl } from "../utils/windowPreview";

describe("buildWindowPreviewFallbackDataUrl", () => {
  it("returns an SVG data URL containing the provided title", () => {
    const url = buildWindowPreviewFallbackDataUrl({
      title: "Firefox",
      iconUrl: "https://example.com/icon.svg",
      subtitle: "Live content",
    });

    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    const encoded = url.split(",", 2)[1] ?? "";
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain("Firefox");
    expect(decoded).toContain("https://example.com/icon.svg");
    expect(decoded).toContain("Live content");
  });

  it("escapes XML special characters", () => {
    const url = buildWindowPreviewFallbackDataUrl({
      title: `A&B <C> "D" 'E'`,
    });
    const encoded = url.split(",", 2)[1] ?? "";
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain("A&amp;B");
    expect(decoded).toContain("&lt;C&gt;");
    expect(decoded).toContain("&quot;D&quot;");
    expect(decoded).toContain("&apos;E&apos;");
  });
});


