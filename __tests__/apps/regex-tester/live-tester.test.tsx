import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import RegexTesterApp from "../../../apps/regex-tester";

describe("regex tester live updates", () => {
  const originalRAF = global.requestAnimationFrame;
  const originalCAF = global.cancelAnimationFrame;
  const originalPerformance = global.performance;

  let rafQueue: Array<{ id: number; cb: FrameRequestCallback }> = [];
  let rafId = 0;
  let now = 0;

  const flushFrames = async () => {
    while (rafQueue.length) {
      const { cb } = rafQueue.shift()!;
      now += 16;
      await act(async () => {
        cb(now);
      });
    }
    await act(async () => {
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    rafQueue = [];
    rafId = 0;
    now = 0;

    global.performance = {
      now: jest.fn(() => now),
    } as unknown as Performance;

    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafQueue.push({ id, cb });
      return id;
    }) as typeof global.requestAnimationFrame;

    global.cancelAnimationFrame = ((id: number) => {
      rafQueue = rafQueue.filter((entry) => entry.id !== id);
    }) as typeof global.cancelAnimationFrame;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    global.performance = originalPerformance;
    rafQueue = [];
  });

  it("highlights 100KB inputs within the timing budget", async () => {
    const { getByLabelText, getByTestId, container } = render(
      <RegexTesterApp />
    );

    await flushFrames();

    const patternInput = getByLabelText(/^Pattern$/i) as HTMLInputElement;
    const textArea = getByLabelText(/regex test input/i) as HTMLTextAreaElement;

    await act(async () => {
      fireEvent.change(patternInput, { target: { value: "error" } });
    });

    await flushFrames();

    const chunk = `error ${"a".repeat(994)}`;
    const largeText = Array.from({ length: 100 }, () => chunk).join("");

    await act(async () => {
      fireEvent.change(textArea, { target: { value: largeText } });
    });

    await flushFrames();

    const summary = getByTestId("regex-summary");
    expect(Number(summary.getAttribute("data-matches"))).toBe(100);
    expect(Number(summary.getAttribute("data-duration"))).toBeLessThan(80);

    const marks = container.querySelectorAll("mark.regex-match");
    expect(marks.length).toBe(100);
  });

  it("renders nested group spans for named captures", async () => {
    const { getByLabelText, container } = render(<RegexTesterApp />);

    await flushFrames();

    const patternInput = getByLabelText(/^Pattern$/i) as HTMLInputElement;
    const textArea = getByLabelText(/regex test input/i) as HTMLTextAreaElement;

    await act(async () => {
      fireEvent.change(patternInput, {
        target: { value: "(?<outer>a(?<inner>b))" },
      });
    });

    await flushFrames();

    await act(async () => {
      fireEvent.change(textArea, { target: { value: "ab cab" } });
    });

    await flushFrames();

    const match = container.querySelector("mark.regex-match");
    expect(match).not.toBeNull();

    const outer = match!.querySelector('[data-group-name="outer"]');
    const inner = match!.querySelector('[data-group-name="inner"]');
    expect(outer).not.toBeNull();
    expect(inner).not.toBeNull();
  });
});
