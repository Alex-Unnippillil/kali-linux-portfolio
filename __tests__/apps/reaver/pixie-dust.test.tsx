import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PixieDustDemo, {
  PIXIE_DUST_STEPS,
  pixieDustInitialState,
  PixieDustState,
  pixieDustReducer,
} from '../../../apps/reaver/components/PixieDustDemo';
import type { AccessPoint } from '../../../apps/reaver/components/APList';

const sampleAp: AccessPoint = {
  ssid: 'CafeWiFi',
  bssid: '00:11:22:33:44:55',
  wps: 'enabled',
};

describe('pixieDustReducer', () => {
  it('ignores NEXT events while a step is animating', () => {
    const state: PixieDustState = { ...pixieDustInitialState };
    const next = pixieDustReducer(state, { type: 'NEXT' });
    expect(next).toBe(state);
  });

  it('transitions to awaitingNext when animation completes', () => {
    const state: PixieDustState = { status: 'animating', stepIndex: 0 };
    const next = pixieDustReducer(state, { type: 'ANIMATION_DONE' });
    expect(next).toEqual({ status: 'awaitingNext', stepIndex: 0 });
  });

  it('advances to the next step when NEXT is received', () => {
    const state: PixieDustState = { status: 'awaitingNext', stepIndex: 0 };
    const next = pixieDustReducer(state, { type: 'NEXT' });
    expect(next).toEqual({ status: 'animating', stepIndex: 1 });
  });

  it('enters the finished state after the final step resolves', () => {
    const lastIndex = PIXIE_DUST_STEPS.length - 1;
    const state: PixieDustState = { status: 'awaitingNext', stepIndex: lastIndex };
    const next = pixieDustReducer(state, { type: 'NEXT' });
    expect(next).toEqual({ status: 'finished', stepIndex: lastIndex });
  });

  it('enters the cancelled state from any point in the workflow', () => {
    const state: PixieDustState = { status: 'animating', stepIndex: 1 };
    const next = pixieDustReducer(state, { type: 'CANCEL' });
    expect(next).toEqual({ status: 'cancelled', stepIndex: 1 });
  });
});

describe('PixieDustDemo component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('blocks Next until the current animation completes', async () => {
    const onExit = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PixieDustDemo ap={sampleAp} onExit={onExit} />);

    const nextButton = screen.getByRole('button', { name: /next step/i });
    expect(nextButton).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(PIXIE_DUST_STEPS[0].duration + 500);
    });

    expect(nextButton).toBeEnabled();
    await user.click(nextButton);

    expect(
      screen.getByRole('heading', { name: PIXIE_DUST_STEPS[1].title })
    ).toBeInTheDocument();
    expect(nextButton).toBeDisabled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('completes all steps and returns to the AP list when finished', async () => {
    const onExit = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PixieDustDemo ap={sampleAp} onExit={onExit} />);

    const nextButton = screen.getByRole('button', { name: /next step/i });

    for (let index = 0; index < PIXIE_DUST_STEPS.length; index += 1) {
      const step = PIXIE_DUST_STEPS[index];
      act(() => {
        jest.advanceTimersByTime(step.duration + 500);
      });
      expect(nextButton).toBeEnabled();
      const expectedLabel = index === PIXIE_DUST_STEPS.length - 1 ? /finish/i : /next step/i;
      expect(nextButton).toHaveTextContent(expectedLabel);
      // eslint-disable-next-line no-await-in-loop
      await user.click(nextButton);
    }

    const exitButton = screen.getByRole('button', {
      name: /return to access points/i,
    });
    await user.click(exitButton);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('cancels the workflow and clears timers', async () => {
    const onExit = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PixieDustDemo ap={sampleAp} onExit={onExit} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onExit).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
