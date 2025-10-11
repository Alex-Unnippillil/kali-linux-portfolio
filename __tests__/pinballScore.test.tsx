import { act, render, screen, waitFor } from "@testing-library/react";
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
  };

  let callbacks: { onScore: (value: number) => void } | null = null;

  return {
    createPinballWorld: jest.fn((_, cb) => {
      callbacks = cb;
      return mockWorld;
    }),
    __callbacks: () => callbacks,
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
    const { __callbacks } = require("../apps/pinball/physics");
    const { unmount } = render(<Pinball />);

    const callbacks = __callbacks();
    expect(callbacks).toBeTruthy();

    act(() => {
      callbacks?.onScore(150);
    });

    await waitFor(() => {
      expect(screen.getByText("000150")).toBeInTheDocument();
      expect(screen.getByText(/HI 000150/)).toBeInTheDocument();
    });

    unmount();

    render(<Pinball />);

    await waitFor(() => {
      expect(screen.getByText(/HI 000150/)).toBeInTheDocument();
    });
  });
});
