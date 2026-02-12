import { render, screen } from "@testing-library/react";
import ChessApp from "../components/apps/chess";

describe("Chess app smoke", () => {
  const originalMatchMedia = window.matchMedia;
  const originalFetch = global.fetch;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: async () => "",
    } as Response);
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: originalMatchMedia,
    });
    global.fetch = originalFetch;
  });

  test("renders without crashing when worker APIs are unavailable", () => {
    const originalWorker = global.Worker;
    // @ts-expect-error runtime check
    delete global.Worker;

    const { unmount } = render(<ChessApp />);
    expect(screen.getByLabelText("Chess board")).toBeInTheDocument();
    unmount();

    global.Worker = originalWorker;
  });
});
