import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OfflineBanner from '../../components/common/OfflineBanner';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

jest.mock('../../hooks/useNetworkStatus', () => {
  const mock = jest.fn();
  return {
    __esModule: true,
    default: mock,
    useNetworkStatus: mock,
  };
});

const mockedUseNetworkStatus = useNetworkStatus as jest.Mock;

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockedUseNetworkStatus.mockReset();
  });

  it('does not render when online', () => {
    mockedUseNetworkStatus.mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows offline message when network is unavailable', () => {
    mockedUseNetworkStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText('Offline mode enabled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Documentation and simulators will use cached content until connectivity returns. Some live features may be unavailable.'
      )
    ).toBeInTheDocument();
  });

  it('can be dismissed but reappears after another offline event', async () => {
    let isOnline = false;
    mockedUseNetworkStatus.mockImplementation(() => isOnline);

    const { rerender } = render(<OfflineBanner />);

    expect(screen.getByText('Offline mode enabled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss offline status banner/i }));
    expect(screen.queryByText('Offline mode enabled')).not.toBeInTheDocument();

    isOnline = true;
    rerender(<OfflineBanner />);
    expect(screen.queryByText('Offline mode enabled')).not.toBeInTheDocument();

    isOnline = false;
    rerender(<OfflineBanner />);

    await waitFor(() => expect(screen.getByText('Offline mode enabled')).toBeInTheDocument());
  });
});
