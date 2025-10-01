import React, { useCallback, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaneError from '../app/error';
import GlobalError from '../app/global-error';
import usePaneSnapshot from '../hooks/usePaneSnapshot';
import {
  capturePaneSnapshot,
  consumePendingPaneRestore,
  __paneSnapshotInternals,
} from '../utils/windowLayout';

jest.mock('../lib/client-error-reporter', () => ({
  reportClientError: jest.fn(),
}));

describe('Pane snapshot error boundaries', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    __paneSnapshotInternals.reset();
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('enables snapshot restore when a pane snapshot exists', () => {
    const reset = jest.fn();
    capturePaneSnapshot('pane-1', { value: 'persisted' });

    render(<PaneError error={new Error('boom')} reset={reset} />);

    const restoreButton = screen.getByRole('button', { name: /restore snapshot/i });
    expect(restoreButton).toBeEnabled();

    fireEvent.click(restoreButton);
    expect(reset).toHaveBeenCalled();
    expect(consumePendingPaneRestore('pane-1')).toEqual({ value: 'persisted' });
  });

  it('disables restore when no snapshot is registered', () => {
    const reset = jest.fn();
    render(<PaneError error={new Error('nope')} reset={reset} />);
    const restoreButton = screen.getByRole('button', { name: /restore snapshot/i });
    expect(restoreButton).toBeDisabled();
  });

  it('renders global error messaging with differentiated actions', () => {
    const reset = jest.fn();
    capturePaneSnapshot('pane-2', { data: 1 });

    render(<GlobalError error={new Error('global')} reset={reset} />);

    expect(screen.getByText(/critical desktop error/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload desktop/i })).toBeInTheDocument();
    const restoreButton = screen.getByRole('button', { name: /restore snapshot/i });
    expect(restoreButton).toBeEnabled();

    fireEvent.click(restoreButton);
    expect(reset).toHaveBeenCalled();
  });

  it('restores a pane snapshot after a crash and clears pending state', async () => {
    const Harness = () => {
      const [error, setError] = useState<Error | null>(null);
      const [shouldThrow, setShouldThrow] = useState(false);
      const [resetKey, setResetKey] = useState(0);

      const reset = () => {
        setError(null);
        setShouldThrow(false);
        setResetKey((key) => key + 1);
      };

      return error ? (
        <PaneError error={error} reset={reset} />
      ) : (
        <TestBoundary
          onError={(err) => setError(err)}
          resetKey={resetKey}
        >
          <ProblemPane
            key={resetKey}
            shouldThrow={shouldThrow}
            onRequestCrash={() => setShouldThrow(true)}
          />
        </TestBoundary>
      );
    };

    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /mutate & crash/i }));

    const restoreButton = await screen.findByRole('button', {
      name: /restore snapshot/i,
    });
    expect(restoreButton).toBeEnabled();

    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByTestId('pane-value')).toHaveTextContent('updated');
    });

    expect(__paneSnapshotInternals.hasPending('test-pane')).toBe(false);
  });
});

interface TestBoundaryProps {
  onError: (error: Error) => void;
  resetKey: number;
  children: React.ReactNode;
}

class TestBoundary extends React.Component<TestBoundaryProps, { hasError: boolean }> {
  constructor(props: TestBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: TestBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface ProblemPaneProps {
  shouldThrow: boolean;
  onRequestCrash: () => void;
}

const ProblemPane: React.FC<ProblemPaneProps> = ({ shouldThrow, onRequestCrash }) => {
  const [value, setValue] = useState('ready');

  const snapshotGetter = useCallback(() => ({ value }), [value]);

  usePaneSnapshot({
    paneId: 'test-pane',
    getSnapshot: snapshotGetter,
    applySnapshot: (snapshot) => {
      setValue(snapshot.value);
    },
  });

  if (shouldThrow) {
    throw new Error('boom');
  }

  return (
    <div>
      <span data-testid="pane-value">{value}</span>
      <button
        type="button"
        onClick={() => {
          capturePaneSnapshot('test-pane', { value: 'updated' });
          setValue('updated');
          onRequestCrash();
        }}
      >
        Mutate & Crash
      </button>
    </div>
  );
};
