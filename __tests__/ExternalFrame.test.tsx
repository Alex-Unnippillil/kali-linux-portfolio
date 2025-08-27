import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ExternalFrame from '../components/ExternalFrame';

describe('ExternalFrame', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('mounts and handles load event', () => {
    const { getByTitle, queryByText } = render(
      <ExternalFrame src="https://allowed.com/page" title="frame" allowlist={['https://allowed.com']} />
    );
    const frame = getByTitle('frame');
    act(() => {
      fireEvent.load(frame);
    });
    expect(queryByText(/Loading/)).not.toBeInTheDocument();
  });

  it('shows offline banner and retries', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    const { getByText } = render(
      <ExternalFrame src="https://allowed.com/page" title="frame" allowlist={['https://allowed.com']} />
    );
    expect(getByText(/offline/i)).toBeInTheDocument();
    act(() => {
      fireEvent.click(getByText(/retry/i));
    });
    expect(getByText(/Loading/)).toBeInTheDocument();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  it('surfaces error after timeout', () => {
    render(<ExternalFrame src="https://allowed.com/page" title="frame" allowlist={['https://allowed.com']} />);
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });
});
