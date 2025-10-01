import React from 'react';
import {
  RenderResult,
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import NetworkBanner from '../components/common/NetworkBanner';

type MockNetworkInformation = NetworkInformation & {
  metered?: boolean;
  dispatchChange: () => void;
};

const setNavigatorOnline = (value: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
};

const setupMockConnection = () => {
  const listeners = new Set<EventListener>();
  const connection: MockNetworkInformation = {
    effectiveType: '4g',
    rtt: 0,
    downlink: 0,
    onchange: null,
    saveData: false,
    addEventListener: jest.fn((event: string, handler: EventListener) => {
      if (event === 'change') {
        listeners.add(handler);
      }
    }),
    removeEventListener: jest.fn((event: string, handler: EventListener) => {
      if (event === 'change') {
        listeners.delete(handler);
      }
    }),
    dispatchChange: () => {
      listeners.forEach(listener => listener(new Event('change')));
    },
  } as MockNetworkInformation;

  Object.defineProperty(window.navigator, 'connection', {
    configurable: true,
    value: connection,
  });

  return connection;
};

const renderBanner = async (ui: React.ReactElement): Promise<RenderResult> => {
  let result: RenderResult | undefined;
  await act(async () => {
    result = render(ui);
  });
  return result!;
};

describe('NetworkBanner', () => {
  beforeEach(() => {
    setNavigatorOnline(true);
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    setNavigatorOnline(true);
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });
  });

  it('disables retry while offline and re-enables when the connection returns', async () => {
    const onRetry = jest.fn();
    setNavigatorOnline(false);

    await renderBanner(<NetworkBanner onRetry={onRetry} />);

    expect(screen.getByText('Offline mode')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry sync/i });
    expect(retryButton).toBeDisabled();

    setNavigatorOnline(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /retry sync/i })).not.toBeDisabled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry sync/i }));
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('updates messaging when the connection becomes metered', async () => {
    const connection = setupMockConnection();
    await renderBanner(<NetworkBanner />);

    expect(screen.queryByText(/Metered connection detected/)).not.toBeInTheDocument();

    connection.metered = true;
    await act(async () => {
      connection.dispatchChange();
    });

    expect(screen.getByText(/Metered connection detected/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sync anyway/i })).not.toBeDisabled();

    connection.metered = false;
    await act(async () => {
      connection.dispatchChange();
    });

    await waitFor(() =>
      expect(screen.queryByText(/Metered connection detected/)).not.toBeInTheDocument()
    );
  });

  it('allows developers to simulate offline and system states', async () => {
    await renderBanner(<NetworkBanner />);

    const select = screen.getByLabelText('Simulate network state');

    await act(async () => {
      fireEvent.change(select, { target: { value: 'offline' } });
    });
    expect(screen.getByText('Offline mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry sync/i })).toBeDisabled();

    await act(async () => {
      fireEvent.change(select, { target: { value: 'metered' } });
    });
    expect(screen.getByText(/Metered connection detected/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(select, { target: { value: 'system' } });
    });
    await waitFor(() =>
      expect(screen.queryByText(/Offline mode/)).not.toBeInTheDocument()
    );
  });
});
