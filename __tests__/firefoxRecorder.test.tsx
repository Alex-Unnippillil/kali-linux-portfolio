import React, { forwardRef, useRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Recorder, {
  MACRO_VERSION,
  RecorderHandle,
  FirefoxMacro,
  parseMacro,
  playMacro,
} from '@/components/apps/firefox/Recorder';

describe('Firefox Recorder', () => {
  const Harness = forwardRef<RecorderHandle>((_, ref) => {
    const targetRef = useRef<HTMLDivElement | null>(null);
    const [clicks, setClicks] = useState(0);

    return (
      <div>
        <div ref={targetRef}>
          <label htmlFor="test-input">Search</label>
          <input id="test-input" aria-label="Search" data-testid="recorder-input" defaultValue="" />
          <button type="button" data-testid="recorder-button" onClick={() => setClicks((value) => value + 1)}>
            Capture
          </button>
          <span data-testid="click-count">{clicks}</span>
        </div>
        <Recorder ref={ref} targetRef={targetRef} />
      </div>
    );
  });

  Harness.displayName = 'Harness';

  it('records interactions and replays them with high fidelity', async () => {
    const ref = React.createRef<RecorderHandle>();
    render(<Harness ref={ref} />);

    fireEvent.click(screen.getByRole('button', { name: /start recording/i }));

    const input = screen.getByTestId('recorder-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'https://www.kali.org/' } });

    const button = screen.getByTestId('recorder-button');
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    const textarea = screen.getByLabelText('Macro JSON') as HTMLTextAreaElement;
    const macro = parseMacro(textarea.value) as FirefoxMacro;

    expect(macro.version).toBe(MACRO_VERSION);
    expect(macro.metadata.eventCount).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('click-count')).toHaveTextContent('1');

    let replayReport: Awaited<ReturnType<RecorderHandle['play']>> | undefined;
    await act(async () => {
      // attach listener for verification before replay
      button.addEventListener('click', () => {
        /* no-op, just ensure event dispatches */
      });
      replayReport = await ref.current?.play();
    });

    expect(screen.getByTestId('recorder-input')).toHaveValue('https://www.kali.org/');
    expect(screen.getByTestId('click-count')).toHaveTextContent('2');
    expect(replayReport?.accuracy ?? 0).toBeGreaterThanOrEqual(0.95);
  });

  it('waits for asynchronous elements when replaying macros', async () => {
    jest.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);

    try {
      let clicked = false;

      const macro: FirefoxMacro = {
        version: MACRO_VERSION,
        createdAt: new Date().toISOString(),
        duration: 120,
        events: [
          {
            type: 'click',
            timestamp: 100,
            target: {
              dataSelector: '[data-testid="delayed-button"]',
              path: 'button[data-testid="delayed-button"]',
              text: 'Delayed',
            },
            pointer: {
              button: 0,
            },
          },
        ],
        metadata: {
          eventCount: 1,
        },
      };

      const playbackPromise = playMacro(container as HTMLElement, macro, { waitForElementTimeout: 500 });

      setTimeout(() => {
        const button = document.createElement('button');
        button.dataset.testid = 'delayed-button';
        button.textContent = 'Delayed';
        button.addEventListener('click', () => {
          clicked = true;
        });
        container.appendChild(button);
      }, 50);

      await act(async () => {
        jest.advanceTimersByTime(60);
      });

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      const report = await playbackPromise;

      expect(clicked).toBe(true);
      expect(report.accuracy).toBeGreaterThanOrEqual(0.95);
      expect(report.successCount).toBe(1);
    } finally {
      jest.useRealTimers();
      document.body.removeChild(container);
    }
  });
});
