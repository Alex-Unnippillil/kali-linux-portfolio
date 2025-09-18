import React from 'react';
import { act, render, screen } from '@testing-library/react';
import AboutApp from '../components/apps/About';

describe('AboutApp print layout', () => {
  const originalMatchMedia = window.matchMedia;
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, 'localStorage', originalLocalStorageDescriptor);
    }
  });

  it('updates the print data attribute when the print media query changes', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();

    const addListener = (listener: MediaQueryListListener | EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.add(listener as (event: MediaQueryListEvent) => void);
      } else if (listener && typeof (listener as EventListenerObject).handleEvent === 'function') {
        listeners.add(
          ((listener as EventListenerObject).handleEvent as unknown as (event: MediaQueryListEvent) => void)
        );
      }
    };

    const removeListener = (listener: MediaQueryListListener | EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
      } else if (listener && typeof (listener as EventListenerObject).handleEvent === 'function') {
        listeners.delete(
          ((listener as EventListenerObject).handleEvent as unknown as (event: MediaQueryListEvent) => void)
        );
      }
    };

    const mockMediaQuery = {
      matches: false,
      media: 'print',
      onchange: null,
      addEventListener: jest.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          addListener(listener);
        }
      }),
      removeEventListener: jest.fn((type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'change') {
          removeListener(listener);
        }
      }),
      addListener: jest.fn((listener: MediaQueryListListener) => addListener(listener)),
      removeListener: jest.fn((listener: MediaQueryListListener) => removeListener(listener)),
      dispatchEvent: jest.fn().mockReturnValue(true),
    } as unknown as MediaQueryList;

    const emit = (matches: boolean) => {
      (mockMediaQuery as unknown as { matches: boolean }).matches = matches;
      listeners.forEach((listener) => {
        listener({ matches } as MediaQueryListEvent);
      });
    };

    window.matchMedia = jest.fn().mockReturnValue(mockMediaQuery);

    const storage: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => (key in storage ? storage[key] : null)),
        setItem: jest.fn((key: string, value: string) => {
          storage[key] = String(value);
        }),
        removeItem: jest.fn((key: string) => {
          delete storage[key];
        }),
        clear: jest.fn(() => {
          for (const key in storage) {
            delete storage[key];
          }
        }),
      },
      configurable: true,
    });

    render(<AboutApp />);

    const root = screen.getByTestId('about-app-root');
    expect(root).toHaveAttribute('data-print-active', 'false');

    act(() => {
      emit(true);
    });

    expect(root).toHaveAttribute('data-print-active', 'true');

    act(() => {
      emit(false);
    });

    expect(root).toHaveAttribute('data-print-active', 'false');
  });
});
