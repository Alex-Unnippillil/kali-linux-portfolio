import { fireEvent, render, screen } from '@testing-library/react';
import PerformanceOverlay, { isPerformanceOverlayEnabled } from '../components/common/PerformanceOverlay';

describe('PerformanceOverlay', () => {
  it('toggles visibility with the keyboard shortcut', () => {
    render(<PerformanceOverlay />);

    expect(screen.queryByText(/Performance overlay/i)).toBeNull();

    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, code: 'KeyP' });

    expect(screen.getByText(/Performance overlay/i)).toBeInTheDocument();
  });

  it('stays hidden when explicitly forced off', () => {
    const { container } = render(<PerformanceOverlay forceEnabled={false} />);

    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, code: 'KeyP' });

    expect(container.firstChild).toBeNull();
  });
});

describe('isPerformanceOverlayEnabled', () => {
  it('requires a dev environment or explicit flag', () => {
    expect(isPerformanceOverlayEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(
      isPerformanceOverlayEnabled({ NODE_ENV: 'production', NEXT_PUBLIC_DEBUG_PERF_OVERLAY: 'true' }),
    ).toBe(true);
    expect(isPerformanceOverlayEnabled({ NODE_ENV: 'development' })).toBe(true);
  });
});
