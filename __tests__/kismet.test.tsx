import React from 'react';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KismetApp from '../components/apps/kismet.jsx';
import ChannelChart from '../apps/kismet/components/ChannelChart';

const setupAnimationFrame = () => {
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  let currentTime = 0;

  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const handle = setTimeout(() => {
      currentTime += 16;
      callback(currentTime);
    }, 16);
    return handle as unknown as number;
  };

  window.cancelAnimationFrame = (id: number) => {
    clearTimeout(id as unknown as NodeJS.Timeout);
  };

  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  const restore = () => {
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
  };

  return { advance, restore };
};

describe('KismetApp', () => {
  it('renders file input', () => {
    render(<KismetApp />);
    expect(screen.getByLabelText(/pcap file/i)).toBeInTheDocument();
  });
});

describe('ChannelChart animation controls', () => {
  let advance: (ms: number) => void;
  let restore: () => void;
  const rotationInterval = 1000;

  beforeEach(() => {
    jest.useFakeTimers();
    ({ advance, restore } = setupAnimationFrame());
  });

  afterEach(() => {
    act(() => {
      restore();
    });
    jest.useRealTimers();
  });

  it('auto-rotates, pauses, and resumes with CPU reduction measurement', async () => {
    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime.bind(jest),
    });
    render(<ChannelChart data={{ 1: 5, 6: 3, 11: 2 }} rotationInterval={rotationInterval} />);

    const readActiveChannel = () => {
      const active = screen
        .getAllByRole('listitem')
        .find((item) => item.getAttribute('aria-current') === 'true');
      return active?.querySelector('span')?.textContent?.trim();
    };

    expect(readActiveChannel()).toBe('1');

    advance(16);
    advance(rotationInterval + 200);
    expect(readActiveChannel()).toBe('6');

    const pauseButton = screen.getByRole('button', { name: /pause rotation/i });
    await user.click(pauseButton);

    advance(rotationInterval * 3);
    expect(readActiveChannel()).toBe('6');

    const reductionCopy = screen.getByText(/CPU load reduced by/).textContent ?? '';
    const reductionMatch = reductionCopy.match(/(\d+)%/);
    expect(reductionMatch).not.toBeNull();
    expect(Number(reductionMatch![1])).toBeGreaterThanOrEqual(50);

    const resumeButton = screen.getByRole('button', { name: /resume rotation/i });
    await user.click(resumeButton);

    advance(rotationInterval + 200);
    expect(readActiveChannel()).toBe('11');
    advance(500);
    expect(screen.getByText(/Frame activity:/)).toBeInTheDocument();
  });
});
