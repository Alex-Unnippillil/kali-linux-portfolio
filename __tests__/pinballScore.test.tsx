import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import Pinball from "../apps/pinball";

jest.mock("../apps/pinball/physics", () => {
  const mockWorld = {
    step: jest.fn(),
    destroy: jest.fn(),
    setBounce: jest.fn(),
    setTheme: jest.fn(),
    setLeftFlipper: jest.fn(),
    setRightFlipper: jest.fn(),
    resetFlippers: jest.fn(),
    nudge: jest.fn(),
    resetBall: jest.fn(),
    launchBall: jest.fn(),
    isBallLocked: jest.fn(() => true),
  };

  let callbacks:
    | {
        onScore: (value: number, meta?: { type?: string; lane?: string }) => void;
        onBallLost?: () => void;
      }
    | null = null;

  return {
    createPinballWorld: jest.fn((_, cb) => {
      callbacks = cb;
      return mockWorld;
    }),
    __callbacks: () => callbacks,
    __world: () => mockWorld,
    constants: {
      WIDTH: 400,
      HEIGHT: 600,
      DEFAULT_LEFT_ANGLE: Math.PI / 8,
      DEFAULT_RIGHT_ANGLE: -Math.PI / 8,
    },
  };
});

jest.mock(
  "../../components/apps/Games/common",
  () => {
    const React = require("react");
    const { useEffect } = React;
    const Overlay = () => <div data-testid="overlay" />;
    const useGameLoop = (callback: (delta: number) => void, running = true) => {
      useEffect(() => {
        if (!running) return;
        callback(0.016);
      }, [callback, running]);
    };
    return { Overlay, useGameLoop };
  },
  { virtual: true },
);

describe("Pinball scoring", () => {
  const OriginalAudioContext = window.AudioContext;
  const OriginalWebkitAudioContext = (window as any).webkitAudioContext;
  const originalGetGamepads = (navigator as any).getGamepads;

  class FakeAudioContext {
    public state: AudioContextState = "running";
    public currentTime = 0;
    public destination = {};
    resume = jest.fn().mockResolvedValue(undefined);
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      };
    }
  }

  beforeEach(() => {
    localStorage.clear();
    (window as any).AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    (window as any).webkitAudioContext = FakeAudioContext as unknown as typeof AudioContext;
    (navigator as any).getGamepads = () => [];
    const { __world } = require("../apps/pinball/physics");
    const world = __world();
    Object.values(world).forEach((value) => {
      if (typeof value === "function" && "mockClear" in value) {
        (value as jest.Mock).mockClear();
      }
    });
  });

  afterEach(() => {
    window.AudioContext = OriginalAudioContext;
    (window as any).webkitAudioContext = OriginalWebkitAudioContext;
    if (originalGetGamepads) {
      (navigator as any).getGamepads = originalGetGamepads;
    } else {
      delete (navigator as any).getGamepads;
    }
  });

  it("updates score and persists high score", async () => {
    const { __callbacks, __world } = require("../apps/pinball/physics");
    const { unmount } = render(<Pinball />);

    expect(__world().resetBall).toHaveBeenCalled();
    const callbacks = __callbacks();
    expect(callbacks).toBeTruthy();

    act(() => {
      callbacks?.onScore(150);
    });

    await waitFor(() => {
      expect(screen.getByTestId("pinball-score")).toHaveTextContent("000150");
      expect(screen.getByTestId("pinball-high-score")).toHaveTextContent(
        "000150",
      );
    });

    unmount();

    render(<Pinball />);

    await waitFor(() => {
      expect(screen.getByTestId("pinball-high-score")).toHaveTextContent(
        "000150",
      );
    });
  });
});

describe("Pinball ball lifecycle", () => {
  it("launches, tracks ball count, and ends the game", async () => {
    const { __callbacks, __world } = require("../apps/pinball/physics");
    render(<Pinball />);

    const launchButton = screen.getByTestId("pinball-launch-button");
    expect(launchButton).toBeEnabled();
    expect(screen.getByTestId("pinball-balls")).toHaveTextContent("3");

    fireEvent.click(launchButton);
    expect(__world().launchBall).toHaveBeenCalledWith(0.8);
    expect(screen.getByTestId("pinball-launch-button")).toBeDisabled();

    const callbacks = __callbacks();
    act(() => {
      callbacks?.onBallLost?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("pinball-balls")).toHaveTextContent("3");
    });

    expect(screen.getByTestId("pinball-launch-button")).toBeEnabled();

    act(() => {
      callbacks?.onBallLost?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("pinball-balls")).toHaveTextContent("2");
    });

    act(() => {
      callbacks?.onBallLost?.();
      callbacks?.onBallLost?.();
    });

    await waitFor(() => {
      const banner = screen.getByTestId("pinball-status-banner");
      expect(
        within(banner).getByText(/Hit reset to start a new run/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("pinball-launch-button")).toBeDisabled();
    expect(__world().resetBall.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("saves the ball during the grace period after launch", async () => {
    const { __callbacks } = require("../apps/pinball/physics");
    render(<Pinball />);

    fireEvent.click(screen.getByTestId("pinball-launch-button"));
    expect(screen.getByTestId("pinball-ball-saver")).toHaveTextContent(/active/i);

    act(() => {
      __callbacks()?.onBallLost?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId("pinball-balls")).toHaveTextContent("3");
    });
  });

  it("activates a multiplier when both lanes are hit", async () => {
    const { __callbacks } = require("../apps/pinball/physics");
    render(<Pinball />);

    act(() => {
      __callbacks()?.onScore(100, { type: "lane", lane: "left" });
      __callbacks()?.onScore(100, { type: "lane", lane: "right" });
    });

    await waitFor(() => {
      expect(screen.getByTestId("pinball-multiplier")).toHaveTextContent(/2x/i);
    });
  });

  it("ignores keyboard input when the window is not focused", () => {
    const { __world } = require("../apps/pinball/physics");
    render(<Pinball isFocused={false} />);

    __world().setLeftFlipper.mockClear();

    const playfield = screen.getByTestId("pinball-playfield");
    fireEvent.keyDown(playfield, { code: "ArrowLeft" });

    expect(__world().setLeftFlipper).not.toHaveBeenCalled();
  });
});
