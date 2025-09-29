import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ToastProvider from '../components/ui/ToastProvider';
import useToast from '../hooks/useToast';

describe('ToastProvider', () => {
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const TestButtons: React.FC = () => {
    const { pushToast } = useToast();
    return (
      <div>
        <button onClick={() => pushToast({ message: 'Toast 1', duration: 50 })}>
          Add 1
        </button>
        <button onClick={() => pushToast({ message: 'Toast 2', duration: 50 })}>
          Add 2
        </button>
        <button onClick={() => pushToast({ message: 'Toast 3', duration: 50 })}>
          Add 3
        </button>
      </div>
    );
  };

  it('queues toasts beyond the visible limit and promotes them as space frees up', async () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 2'));
    fireEvent.click(screen.getByText('Add 3'));

    expect(await screen.findByText('Toast 1')).toBeInTheDocument();
    expect(await screen.findByText('Toast 2')).toBeInTheDocument();
    expect(screen.queryByText('Toast 3')).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    });
  });

  it('dismisses the top-most toast when Escape is pressed', async () => {
    jest.useFakeTimers();

    render(
      <ToastProvider>
        <TestButtons />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Add 1'));
    fireEvent.click(screen.getByText('Add 2'));

    expect(await screen.findByText('Toast 1')).toBeInTheDocument();
    expect(await screen.findByText('Toast 2')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
    });
  });
});
