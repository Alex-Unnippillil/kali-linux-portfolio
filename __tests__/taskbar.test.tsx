import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Taskbar from '../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const apps = [{ id: 'app1', title: 'App One', icon: '/icon.png' }];

describe('Taskbar', () => {
  it('minimizes focused window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: false }}
        focused_windows={{ app1: true }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(minimize).toHaveBeenCalledWith('app1');
    expect(button).toHaveAttribute('data-context', 'taskbar');
  });

  it('restores minimized window on click', () => {
    const openApp = jest.fn();
    const minimize = jest.fn();
    render(
      <Taskbar
        apps={apps}
        closed_windows={{ app1: false }}
        minimized_windows={{ app1: true }}
        focused_windows={{ app1: false }}
        openApp={openApp}
        minimize={minimize}
      />
    );
    const button = screen.getByRole('button', { name: /app one/i });
    fireEvent.click(button);
    expect(openApp).toHaveBeenCalledWith('app1');
  });

  describe('idle visibility behaviour', () => {
    const renderTaskbar = () => {
      const openApp = jest.fn();
      const minimize = jest.fn();
      const utils = render(
        <Taskbar
          apps={apps}
          closed_windows={{ app1: false }}
          minimized_windows={{ app1: false }}
          focused_windows={{ app1: false }}
          openApp={openApp}
          minimize={minimize}
        />
      );

      const toolbar = utils.container.querySelector('[role="toolbar"]') as HTMLElement;
      return { ...utils, toolbar };
    };

    const advanceIdle = () => {
      act(() => {
        jest.advanceTimersByTime(1200);
      });
    };

    const dispatchPointerMove = (y: number) => {
      const event = typeof PointerEvent === 'function'
        ? new PointerEvent('pointermove', { clientY: y })
        : (() => {
            const fallback = document.createEvent('Event');
            fallback.initEvent('pointermove', true, true);
            Object.defineProperty(fallback, 'clientY', { value: y });
            return fallback;
          })();
      act(() => {
        window.dispatchEvent(event);
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('hides the taskbar after the idle timeout', () => {
      const { toolbar } = renderTaskbar();
      advanceIdle();
      expect(toolbar).toHaveClass('translate-y-full');
      expect(toolbar).toHaveAttribute('aria-hidden', 'true');
    });

    it('reveals the taskbar when hovering near the screen edge', () => {
      const { toolbar } = renderTaskbar();
      advanceIdle();
      expect(toolbar).toHaveClass('translate-y-full');

      dispatchPointerMove(window.innerHeight - 1);

      expect(toolbar).toHaveClass('translate-y-0');
      expect(toolbar).not.toHaveAttribute('aria-hidden', 'true');
    });

    it('reveals the taskbar when the Meta key is pressed', () => {
      const { toolbar } = renderTaskbar();
      advanceIdle();

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Meta' }));
      });

      expect(toolbar).toHaveClass('translate-y-0');
    });

    it('stays visible while focused via the keyboard', () => {
      const { toolbar } = renderTaskbar();
      const button = screen.getByRole('button', { name: /app one/i });
      advanceIdle();

      act(() => {
        (button as HTMLElement).focus();
      });

      expect(toolbar).toHaveClass('translate-y-0');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(toolbar).toHaveClass('translate-y-0');
    });
  });
});
