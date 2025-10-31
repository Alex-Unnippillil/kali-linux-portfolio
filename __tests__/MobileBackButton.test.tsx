import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MobileBackButton from '../components/apps/MobileBackButton';

declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
}

describe('MobileBackButton', () => {
  let currentMatches = true;
  let listeners: Set<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    currentMatches = true;
    listeners = new Set();
    window.matchMedia = jest.fn().mockImplementation((query: string) => {
      const mediaQueryList: MediaQueryList = {
        media: query,
        onchange: null,
        addEventListener: jest.fn((event, callback: EventListenerOrEventListenerObject) => {
          if (event === 'change' && typeof callback === 'function') {
            listeners.add(callback as (event: MediaQueryListEvent) => void);
          }
        }),
        removeEventListener: jest.fn((event, callback: EventListenerOrEventListenerObject) => {
          if (event === 'change' && typeof callback === 'function') {
            listeners.delete(callback as (event: MediaQueryListEvent) => void);
          }
        }),
        addListener: jest.fn((callback: (event: MediaQueryListEvent) => void) => {
          listeners.add(callback);
        }),
        removeListener: jest.fn((callback: (event: MediaQueryListEvent) => void) => {
          listeners.delete(callback);
        }),
        dispatchEvent: jest.fn((event: Event) => {
          listeners.forEach((listener) => listener(event as MediaQueryListEvent));
          return true;
        }),
      } as unknown as MediaQueryList;

      Object.defineProperty(mediaQueryList, 'matches', {
        get: () => currentMatches,
      });

      return mediaQueryList;
    });
  });

  const emitChange = (matches: boolean) => {
    currentMatches = matches;
    const event = { matches } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  };

  it('renders when the viewport is narrow', async () => {
    currentMatches = true;
    render(<MobileBackButton appId="demo" />);
    await waitFor(() => {
      expect(screen.getByTestId('mobile-back-button')).toBeInTheDocument();
    });
  });

  it('marks button as inactive on wide viewports', async () => {
    currentMatches = false;
    render(<MobileBackButton appId="demo" />);
    const button = await screen.findByTestId('mobile-back-button');
    expect(button).toHaveAttribute('data-mobile-active', 'false');
  });

  it('invokes onBack when clicked', async () => {
    const onBack = jest.fn();
    render(<MobileBackButton appId="demo" onBack={onBack} />);
    const button = await screen.findByTestId('mobile-back-button');
    fireEvent.click(button);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('responds to Alt+ArrowLeft', async () => {
    const onBack = jest.fn();
    render(<MobileBackButton appId="demo" onBack={onBack} />);
    await screen.findByTestId('mobile-back-button');
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true });
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('reacts to viewport changes', async () => {
    currentMatches = false;
    render(<MobileBackButton appId="demo" />);
    const button = await screen.findByTestId('mobile-back-button');
    expect(button).toHaveAttribute('data-mobile-active', 'false');
    emitChange(true);
    await waitFor(() => {
      expect(button).toHaveAttribute('data-mobile-active', 'true');
    });
  });
});
