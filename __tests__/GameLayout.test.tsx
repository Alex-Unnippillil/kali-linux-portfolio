import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameLayout from '../components/apps/GameLayout';

jest.mock('../components/apps/Games/common/perf', () => ({
  __esModule: true,
  default: function PerfOverlayMock() {
    return <div data-testid="perf" />;
  },
}));
jest.mock('../hooks/usePrefersReducedMotion', () => jest.fn(() => false));

declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
}

describe('GameLayout mobile back control', () => {
  let currentMatches = true;

  beforeEach(() => {
    currentMatches = true;
    window.matchMedia = jest.fn().mockImplementation(() => {
      const mediaQueryList: MediaQueryList = {
        media: '(max-width: 479px)',
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      } as unknown as MediaQueryList;
      Object.defineProperty(mediaQueryList, 'matches', {
        get: () => currentMatches,
      });
      return mediaQueryList;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a back button on narrow viewports', async () => {
    render(
      <GameLayout gameId="demo">
        <div>content</div>
      </GameLayout>,
    );
    expect(await screen.findByTestId('mobile-back-button')).toBeInTheDocument();
  });

  it('clicking back button triggers window close element', async () => {
    const close = document.createElement('button');
    close.id = 'close-demo';
    const onClose = jest.fn();
    close.addEventListener('click', onClose);
    document.body.appendChild(close);

    render(
      <GameLayout gameId="demo">
        <div>content</div>
      </GameLayout>,
    );

    const backButton = await screen.findByTestId('mobile-back-button');
    fireEvent.click(backButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles Alt+ArrowLeft to trigger back action', async () => {
    const close = document.createElement('button');
    close.id = 'close-demo';
    const onClose = jest.fn();
    close.addEventListener('click', onClose);
    document.body.appendChild(close);

    render(
      <GameLayout gameId="demo">
        <div>content</div>
      </GameLayout>,
    );

    await screen.findByTestId('mobile-back-button');
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(onClose).toHaveBeenCalled();
  });
});
