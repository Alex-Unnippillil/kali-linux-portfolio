import {
  sanitizeClipboardText,
  summarizeSanitization,
  type PasteMode,
} from "../utils/clipboard/sanitize";

describe("sanitizeClipboardText", () => {
  const run = (text: string, mode: PasteMode) => sanitizeClipboardText(text, mode);

  it("returns original text when keeping formatting", () => {
    const result = run("echo $PATH", "keep");
    expect(result.sanitized).toBe("echo $PATH");
    expect(result.wasModified).toBe(false);
  });

  it("strips HTML markup when converting to plain text", () => {
    const result = run("<p>Hello&nbsp;<strong>World</strong></p>", "plain");
    expect(result.sanitized).toBe("Hello World");
    expect(result.wasModified).toBe(true);
    expect(result.strippedHtml).toBe(true);
    expect(summarizeSanitization(result)).toBe("Converted clipboard contents to plain text.");
  });

  it("wraps content in a code fence for code block mode", () => {
    const result = run("console.log('hi');", "code-block");
    expect(result.sanitized).toBe("```\nconsole.log('hi');\n```");
    expect(result.wasModified).toBe(true);
    expect(result.wrappedInCodeBlock).toBe(true);
  });

  it("removes tracking parameters from URLs", () => {
    const result = sanitizeClipboardText(
      "https://example.com/?utm_source=newsletter&foo=bar#utm_medium=email",
      "clean-url",
      {
        trackingParameters: {
          query: ["utm_source"],
          hash: ["utm_medium"],
        },
      },
    );
    expect(result.sanitized).toBe("https://example.com/?foo=bar");
    expect(result.removedTrackingParameters).toEqual(["utm_source", "utm_medium"]);
    expect(result.wasModified).toBe(true);
    expect(summarizeSanitization(result)).toContain("utm_source");
  });
});
