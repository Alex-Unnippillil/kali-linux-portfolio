import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DocsRenderer from "@/components/apps/docs/DocsRenderer";

describe("DocsRenderer", () => {
  test("generates unique slugified anchors and exposes copy controls", async () => {
    const onAnchorClick = jest.fn();
    const onAnchorsRendered = jest.fn();

    const html = `
      <h2>Getting Started</h2>
      <h2>Getting Started</h2>
      <h3>Ümlaut & Stuff!</h3>
    `;

    render(
      <DocsRenderer
        html={html}
        onAnchorClick={onAnchorClick}
        onAnchorsRendered={onAnchorsRendered}
      />
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /copy link to/i })
      ).toHaveLength(3);
    });

    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("h2, h3")
    );

    expect(headings[0].id).toBe("getting-started");
    expect(headings[1].id).toBe("getting-started-2");
    expect(headings[2].id).toBe("umlaut-stuff");

    const anchors = screen.getAllByRole("button", {
      name: /copy link to/i,
    });

    expect(anchors[0]).toHaveAttribute("data-docs-anchor", "getting-started");

    const user = userEvent.setup();
    await user.click(anchors[0]);
    expect(onAnchorClick).toHaveBeenCalledWith("getting-started");

    expect(onAnchorsRendered).toHaveBeenCalledWith([
      "getting-started",
      "getting-started-2",
      "umlaut-stuff",
    ]);
  });
});
