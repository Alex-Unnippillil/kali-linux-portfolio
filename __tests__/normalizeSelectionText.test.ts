import { normalizeSelectionText } from "../utils/clipboard";

describe("normalizeSelectionText", () => {
  it("merges hyphenated line breaks", () => {
    expect(normalizeSelectionText("co-\r\noperation")).toBe("cooperation");
  });

  it("removes repeated whitespace and newlines", () => {
    expect(normalizeSelectionText("Hello\n\n   world")).toBe("Hello world");
  });

  it("strips soft hyphens and trims ends", () => {
    const softHyphen = "\u00ad";
    expect(normalizeSelectionText(`${softHyphen} spaced  text ${softHyphen}`)).toBe("spaced text");
  });

  it("returns an empty string when nothing remains", () => {
    expect(normalizeSelectionText("   \n  ")).toBe("");
  });
});
