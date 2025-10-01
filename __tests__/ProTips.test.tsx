import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProTips, { ProTip } from '../components/common/ProTips';

describe('ProTips', () => {
  const sampleTips: ProTip[] = [
    { id: 'tip-1', title: 'Tip 1', body: 'First tip body' },
    { id: 'tip-2', title: 'Tip 2', body: 'Second tip body' },
    { id: 'tip-3', title: 'Tip 3', body: 'Third tip body' },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it('rotates tips on an interval when not pinned', () => {
    jest.useFakeTimers();
    render(<ProTips tips={sampleTips} rotationIntervalMs={1000} />);

    expect(screen.getByText('First tip body')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Second tip body')).toBeInTheDocument();
  });

  it('stores dismissed tips so they remain hidden across renders', async () => {
    const { unmount } = render(<ProTips tips={sampleTips} rotationIntervalMs={1000} />);

    fireEvent.click(screen.getByRole('button', { name: /never show again/i }));

    await waitFor(() => expect(screen.getByText('Second tip body')).toBeInTheDocument());

    unmount();

    render(<ProTips tips={sampleTips} rotationIntervalMs={1000} />);

    expect(screen.queryByText('First tip body')).not.toBeInTheDocument();
    expect(screen.getByText('Second tip body')).toBeInTheDocument();
  });

  it('pauses rotation while a tip is pinned and resumes when unpinned', () => {
    jest.useFakeTimers();
    render(<ProTips tips={sampleTips} rotationIntervalMs={1000} />);

    expect(screen.getByText('First tip body')).toBeInTheDocument();

    const pinButton = screen.getByRole('button', { name: /pin tip/i });
    fireEvent.click(pinButton);
    expect(pinButton).toHaveTextContent(/unpin tip/i);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('First tip body')).toBeInTheDocument();

    fireEvent.click(pinButton);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('Second tip body')).toBeInTheDocument();
  });
});
