import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("marked", () => ({
  marked: {
    parse: (markdown: string) =>
      markdown
        .split(/\n{2,}/)
        .map((block) => {
          const match = block.trim().match(/^(#{1,6})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            return `<h${level}>${text}</h${level}>`;
          }
          const trimmed = block.trim();
          return trimmed ? `<p>${trimmed}</p>` : "";
        })
        .join(""),
  },
}));

import DocsViewer from "@/components/apps/docs/DocsViewer";

describe("DocsViewer", () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const originalClipboard = Object.getOwnPropertyDescriptor(
    navigator,
    "clipboard"
  );
  let scrollMock: jest.Mock;
  let clipboardWriteMock: jest.Mock;

  beforeEach(() => {
    scrollMock = jest.fn();
    Element.prototype.scrollIntoView = scrollMock;
    window.location.hash = "";

    clipboardWriteMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: clipboardWriteMock,
      },
    });
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", originalClipboard);
    } else {
      delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
    }
    window.location.hash = "";
  });

  test("scrolls to an anchor when the initial hash is present", async () => {
    window.location.hash = "#initial-section";

    render(<DocsViewer markdown="## Initial Section" />);

    await waitFor(() => {
      expect(scrollMock).toHaveBeenCalled();
    });

    expect(scrollMock.mock.calls[0][0]).toEqual({ behavior: "smooth", block: "start" });
  });

  test("copies the heading link, updates the hash, and scrolls on icon click", async () => {
    const replaceStateSpy = jest.spyOn(window.history, "replaceState");

    render(<DocsViewer markdown="## Copy Target" />);

    const control = await screen.findByRole("button", {
      name: "Copy link to Copy Target",
    });

    fireEvent.click(control);

    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(window.location.hash).toBe("#copy-target");
    });

    await waitFor(() => {
      expect(clipboardWriteMock).toHaveBeenCalled();
    });

    expect(clipboardWriteMock).toHaveBeenCalledWith(
      "http://localhost/#copy-target"
    );
    expect(window.location.hash).toBe("#copy-target");
    expect(scrollMock).toHaveBeenCalled();

    replaceStateSpy.mockRestore();
  });
});
