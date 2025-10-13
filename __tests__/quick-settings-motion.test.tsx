import { fireEvent, render, screen } from '@testing-library/react';
import QuickSettings from '../components/ui/QuickSettings';

const motionSwitchName = /disable animations/i;

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    // @ts-expect-error - jsdom does not provide RAF, a timeout stub is sufficient for tests
    window.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(Date.now()), 0);
  }

  if (!window.cancelAnimationFrame) {
    // @ts-expect-error - match the requestAnimationFrame stub signature
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

describe('QuickSettings motion controls', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('reduce-motion');
    document.documentElement.removeAttribute('data-motion');
    document.documentElement.style.removeProperty('--motion-duration-user-scale');
    document.documentElement.style.removeProperty('--motion-animation-user-state');
  });

  it('disables animations when the override switch is turned on', () => {
    render(<QuickSettings open />);

    const motionSwitch = screen.getByRole('switch', { name: motionSwitchName });
    expect(motionSwitch).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(motionSwitch);

    expect(motionSwitch).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    expect(document.documentElement.getAttribute('data-motion')).toBe('reduced');
    expect(document.documentElement.style.getPropertyValue('--motion-duration-user-scale')).toBe('0');
    expect(document.documentElement.style.getPropertyValue('--motion-animation-user-state')).toBe('paused');
  });

  it('restores motion defaults when the override switch is turned off', () => {
    window.localStorage.setItem('qs-reduce-motion', 'true');

    render(<QuickSettings open />);

    const motionSwitch = screen.getByRole('switch', { name: motionSwitchName });
    expect(motionSwitch).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);

    fireEvent.click(motionSwitch);

    expect(motionSwitch).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(false);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--motion-duration-user-scale')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--motion-animation-user-state')).toBe('');
  });
});
