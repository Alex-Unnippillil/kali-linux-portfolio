import React from "react";
import { act, render } from "@testing-library/react";
import useVisualViewport from "../hooks/useVisualViewport";

describe("useVisualViewport", () => {
  const originalVisualViewport = (window as any).visualViewport;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    jest.useRealTimers();
    if (originalVisualViewport === undefined) {
      delete (window as any).visualViewport;
    } else {
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        writable: true,
        value: originalVisualViewport,
      });
    }
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalInnerHeight,
    });
  });

  it("subscribes to viewport events and cleans up on unmount", () => {
    jest.useFakeTimers();

    const listeners = new Map<string, Set<EventListener>>();
    const addEventListenerMock = jest.fn((event: string, handler: EventListener) => {
      const existing = listeners.get(event) ?? new Set<EventListener>();
      existing.add(handler);
      listeners.set(event, existing);
    });
    const removeEventListenerMock = jest.fn((event: string, handler: EventListener) => {
      const existing = listeners.get(event);
      if (!existing) return;
      existing.delete(handler);
      if (existing.size === 0) {
        listeners.delete(event);
      }
    });

    const mockViewport = {
      width: 800,
      height: 600,
      offsetLeft: 0,
      offsetTop: 0,
      scale: 1,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    } as unknown as VisualViewport & {
      addEventListener: typeof addEventListenerMock;
      removeEventListener: typeof removeEventListenerMock;
    };

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      writable: true,
      value: mockViewport,
    });

    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      const timeout = setTimeout(() => callback(Date.now()), 0);
      return timeout as unknown as number;
    }) as typeof window.requestAnimationFrame;

    window.cancelAnimationFrame = ((handle: number) => {
      clearTimeout(handle);
    }) as typeof window.cancelAnimationFrame;

    const dispatch = (event: string) => {
      const handlers = listeners.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => handler.call(mockViewport, new Event(event)));
    };

    function Consumer() {
      const viewport = useVisualViewport();
      return (
        <div data-testid="viewport" data-scale={viewport.scale}>
          {`${viewport.width}x${viewport.height}@${viewport.left},${viewport.top}`}
        </div>
      );
    }

    const { getByTestId, unmount } = render(<Consumer />);

    expect(addEventListenerMock).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    );
    expect(addEventListenerMock).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      expect.objectContaining({ passive: true }),
    );
    expect(getByTestId("viewport").textContent).toBe("800x600@0,0");

    act(() => {
      mockViewport.width = 640;
      mockViewport.height = 480;
      dispatch("resize");
      jest.runOnlyPendingTimers();
    });

    expect(getByTestId("viewport").textContent).toBe("640x480@0,0");

    act(() => {
      mockViewport.offsetLeft = 24;
      mockViewport.offsetTop = 12;
      dispatch("scroll");
      jest.runOnlyPendingTimers();
    });

    expect(getByTestId("viewport").textContent).toBe("640x480@24,12");

    unmount();

    expect(removeEventListenerMock).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeEventListenerMock).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(listeners.size).toBe(0);

    const secondRender = render(<Consumer />);

    expect(addEventListenerMock).toHaveBeenCalledTimes(4);
    expect(listeners.get("resize")?.size ?? 0).toBe(1);
    expect(listeners.get("scroll")?.size ?? 0).toBe(1);

    secondRender.unmount();
  });

  it("falls back to window metrics when visualViewport is unavailable", () => {
    delete (window as any).visualViewport;
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(Date.now());
      return 0 as unknown as number;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });

    function Consumer() {
      const viewport = useVisualViewport();
      return (
        <div data-testid="viewport">
          {`${viewport.width}x${viewport.height}@${viewport.left},${viewport.top}`}
        </div>
      );
    }

    const { getByTestId } = render(<Consumer />);

    expect(getByTestId("viewport").textContent).toBe("1440x900@0,0");

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 1024,
      });
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        writable: true,
        value: 768,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(getByTestId("viewport").textContent).toBe("1024x768@0,0");
  });

  it("stops reacting to events after unmount", () => {
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(Date.now());
      return 0 as unknown as number;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = (() => {}) as typeof window.cancelAnimationFrame;

    const listeners = new Map<string, EventListener>();
    const addEventListenerOriginal = window.addEventListener;
    const removeEventListenerOriginal = window.removeEventListener;

    window.addEventListener = ((type: string, handler: EventListener) => {
      listeners.set(type, handler);
      return addEventListenerOriginal.call(window, type, handler);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, handler: EventListener) => {
      listeners.delete(type);
      return removeEventListenerOriginal.call(window, type, handler);
    }) as typeof window.removeEventListener;

    let renderCount = 0;

    function Consumer() {
      renderCount += 1;
      const viewport = useVisualViewport();
      return <div data-testid="viewport">{viewport.width}</div>;
    }

    const { getByTestId, unmount } = render(<Consumer />);

    expect(getByTestId("viewport").textContent).toBe(String(window.innerWidth));
    expect(renderCount).toBeGreaterThan(0);

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 960,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(getByTestId("viewport").textContent).toBe("960");
    const rendersBeforeUnmount = renderCount;

    unmount();

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        writable: true,
        value: 800,
      });
      const handler = listeners.get("resize");
      if (handler) {
        handler(new Event("resize"));
      }
    });

    expect(renderCount).toBe(rendersBeforeUnmount);

    window.addEventListener = addEventListenerOriginal;
    window.removeEventListener = removeEventListenerOriginal;
  });
});
