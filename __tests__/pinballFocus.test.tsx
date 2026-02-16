import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  return {
    createPinballWorld: jest.fn(() => mockWorld),
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

jest.mock("../apps/pinball/tilt", () => ({
  useTiltSensor: jest.fn(),
}));

describe("Pinball focus behavior", () => {
  beforeEach(() => {
    const { __world } = require("../apps/pinball/physics");
    const world = __world();
    Object.values(world).forEach((value) => {
      if (typeof value === "function" && "mockClear" in value) {
        (value as jest.Mock).mockClear();
      }
    });
  });

  it("does not respond to keyboard input when unfocused", () => {
    const { __world } = require("../apps/pinball/physics");

    render(<Pinball windowMeta={{ isFocused: false }} />);

    fireEvent.keyDown(window, { code: "ArrowLeft" });

    expect(__world().setLeftFlipper).not.toHaveBeenCalled();
  });

  it("does not step physics while unfocused", () => {
    const { __world } = require("../apps/pinball/physics");

    render(<Pinball windowMeta={{ isFocused: false }} />);

    expect(__world().step).not.toHaveBeenCalled();
  });

  it("auto-pauses and resets flippers on blur", async () => {
    const { __world } = require("../apps/pinball/physics");

    const { rerender } = render(<Pinball windowMeta={{ isFocused: true }} />);

    __world().resetFlippers.mockClear();

    rerender(<Pinball windowMeta={{ isFocused: false }} />);

    await waitFor(() => {
      expect(screen.getByText("Paused.")).toBeInTheDocument();
    });

    expect(__world().resetFlippers).toHaveBeenCalledTimes(1);
  });
});
