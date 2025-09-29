import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ event: jest.fn(), send: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => ({
  __esModule: true,
  default: ({ id }: { id: string }) => <div data-testid={`window-${id}`} />,
}));

const noop = () => {};

describe('Desktop keyboard drag accessibility', () => {
  let liveRegion: HTMLDivElement;
  let handleAnnounce: (event: Event) => void;
  let timers: Set<ReturnType<typeof setTimeout>>;

  beforeEach(() => {
    jest.useFakeTimers();
    timers = new Set();
    liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);

    handleAnnounce = (event: Event) => {
      const detail: any = (event as CustomEvent).detail ?? {};
      const message = typeof detail === 'string' ? detail : detail.message;
      const politeness = typeof detail?.politeness === 'string' ? detail.politeness : 'polite';
      liveRegion.setAttribute('aria-live', politeness === 'assertive' ? 'assertive' : 'polite');
      liveRegion.textContent = '';
      const timer = setTimeout(() => {
        liveRegion.textContent = message || '';
        timers.delete(timer);
      }, 100);
      timers.add(timer);
    };

    window.addEventListener('sr-announce', handleAnnounce);
  });

  afterEach(() => {
    window.removeEventListener('sr-announce', handleAnnounce);
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    if (liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion);
    }
    jest.useRealTimers();
  });

  const renderDesktop = () =>
    render(
      <Desktop
        clearSession={noop}
        session={{}}
        setSession={noop}
        snapEnabled={false}
      />,
    );

  it('announces keyboard drag lifecycle via the live region', async () => {
    renderDesktop();

    const firefoxIcon = await screen.findByRole('button', { name: /firefox/i });

    fireEvent.keyDown(firefoxIcon, { key: ' ', code: 'Space' });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(firefoxIcon).toHaveAttribute('aria-grabbed', 'true');
    expect(liveRegion.textContent).toMatch(/picked up firefox/i);

    fireEvent.keyDown(firefoxIcon, { key: 'ArrowRight', code: 'ArrowRight' });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(liveRegion.textContent).toMatch(/moved/i);

    fireEvent.keyDown(firefoxIcon, { key: ' ', code: 'Space' });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(firefoxIcon).toHaveAttribute('aria-grabbed', 'false');
    expect(liveRegion.textContent).toMatch(/dropped firefox/i);
  });

  it('marks desktop and dock as drop targets during a drag', async () => {
    renderDesktop();

    const firefoxIcon = await screen.findByRole('button', { name: /firefox/i });
    const grid = await screen.findByRole('grid', { name: /desktop icons/i });
    const dock = await screen.findByRole('toolbar', { name: /dock/i });

    fireEvent.keyDown(firefoxIcon, { key: ' ', code: 'Space' });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(grid).toHaveAttribute('aria-dropeffect', 'move');
    expect(dock).toHaveAttribute('aria-dropeffect', 'move');

    fireEvent.keyDown(firefoxIcon, { key: ' ', code: 'Space' });
    await act(async () => {
      jest.advanceTimersByTime(120);
    });

    expect(grid).not.toHaveAttribute('aria-dropeffect');
    expect(dock).not.toHaveAttribute('aria-dropeffect');
  });
});
