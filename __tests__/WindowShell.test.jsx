import React, { act, createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../hooks/useDocPiP", () => () => ({ togglePin: jest.fn() }));

jest.mock("react-ga4", () => ({
  send: jest.fn(),
  event: jest.fn(),
}));

let draggableProps = null;

jest.mock("react-draggable", () => {
  return {
    __esModule: true,
    default: (props) => {
      draggableProps = props;
      return <div data-testid="draggable-mock">{props.children}</div>;
    },
  };
});

jest.mock("../components/apps/terminal", () => ({ displayTerminal: jest.fn() }));

jest.mock("../utils/windowLayout", () => {
  const actual = jest.requireActual("../utils/windowLayout");
  return {
    ...actual,
    measureSafeAreaInset: jest.fn(() => 0),
    measureWindowTopOffset: jest.fn(() => actual.DEFAULT_WINDOW_TOP_OFFSET),
    measureSnapBottomInset: jest.fn(() => actual.DEFAULT_SNAP_BOTTOM_INSET),
  };
});

import Window from "../components/base/window";
import {
  measureSafeAreaInset,
  measureWindowTopOffset,
  measureSnapBottomInset,
} from "../utils/windowLayout";

const measureSafeAreaInsetMock = measureSafeAreaInset;
const measureWindowTopOffsetMock = measureWindowTopOffset;
const measureSnapBottomInsetMock = measureSnapBottomInset;

const renderWindow = (props = {}) => {
  const ref = createRef();
  const result = render(
    <Window
      ref={ref}
      id="shell-window"
      title="Shell Window"
      screen={() => <div>content</div>}
      focus={() => {}}
      hasMinimised={() => {}}
      closed={() => {}}
      openApp={() => {}}
      {...props}
    />,
  );
  return { ...result, ref };
};

beforeAll(() => {
  global.requestAnimationFrame = (cb) => {
    cb(0);
    return 1;
  };
});

beforeEach(() => {
  draggableProps = null;
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: 1280 });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 720 });
  measureSafeAreaInsetMock.mockReturnValue(0);
  measureWindowTopOffsetMock.mockReturnValue(32);
  measureSnapBottomInsetMock.mockReturnValue(48);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Window shell interactions", () => {
  it("applies edge resistance during drag updates and updates transform", () => {
    const onPositionChange = jest.fn();
    const { ref } = renderWindow({ onPositionChange });
    const instance = ref.current;
    expect(instance).toBeTruthy();
    const frame = screen.getByRole("dialog", { name: "Shell Window" });

    act(() => {
      instance.setState({
        parentSize: { width: 400, height: 300 },
        safeAreaTop: 32,
      });
    });

    expect(draggableProps).not.toBeNull();
    act(() => {
      draggableProps.onDrag?.(null, {
        node: frame,
        x: -120,
        y: -240,
      });
    });

    expect(frame.style.transform).toBe("translate(0px, 32px)");
  });

  it("keeps resize bounds non-negative when viewport shrinks", () => {
    measureWindowTopOffsetMock.mockReturnValue(640);
    measureSnapBottomInsetMock.mockReturnValue(120);
    Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 600 });
    const { ref } = renderWindow();
    const instance = ref.current;

    act(() => {
      instance.resizeBoundries();
    });

    expect(instance.state.parentSize.height).toBeGreaterThanOrEqual(0);
    expect(instance.state.safeAreaTop).toBe(640);
  });

  it("toggles maximize state on title bar double-click", () => {
    const onSizeChange = jest.fn();
    const { ref } = renderWindow({ onSizeChange });
    const frame = screen.getByRole("dialog", { name: "Shell Window" });
    const titlebar = screen.getByRole("button", { name: "Shell Window" });

    act(() => {
      fireEvent.doubleClick(titlebar);
    });

    expect(frame.getAttribute("data-window-state")).toBe("maximized");
    expect(onSizeChange).toHaveBeenCalled();

    act(() => {
      fireEvent.doubleClick(titlebar);
    });

    expect(frame.getAttribute("data-window-state")).toBe("active");
  });
});
