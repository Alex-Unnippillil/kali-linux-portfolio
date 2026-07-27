import { render, waitFor } from '@testing-library/react';

import PerformanceGraph from '../components/ui/PerformanceGraph';

const createMatchMedia = (matches: boolean) => (query: string): MediaQueryList => ({
  matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('PerformanceGraph', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--kali-accent');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMedia(false),
    });
  });

  it('uses the CSS accent variable when available', async () => {
    document.documentElement.style.setProperty('--kali-accent', '#ff0000');

    const { container } = render(<PerformanceGraph />);

    await waitFor(() => {
      const stops = container.querySelectorAll('stop');
      expect(stops.length).toBeGreaterThanOrEqual(2);
      expect(stops[0]).toHaveAttribute('stop-color', '#ff0000');
      expect(stops[1]).toHaveAttribute('stop-color', '#ff0000');
    });
  });

  it('keeps a static path when reduced motion is preferred', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: createMatchMedia(true),
    });

    const { container } = render(<PerformanceGraph />);
    const path = container.querySelector('path');

    expect(path?.getAttribute('d')).toBeTruthy();

    await waitFor(() => {
      expect(path?.getAttribute('d')).toBeTruthy();
    });
  });
});

