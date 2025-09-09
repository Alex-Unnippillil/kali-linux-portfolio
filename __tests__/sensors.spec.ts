import * as React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import BleSensor from '../components/apps/ble-sensor';

jest.mock('../utils/bleProfiles', () => ({
  loadProfiles: jest.fn().mockResolvedValue([]),
  loadProfile: jest.fn().mockResolvedValue(null),
  saveProfile: jest.fn().mockResolvedValue(undefined),
  renameProfile: jest.fn(),
  deleteProfile: jest.fn(),
}));

describe('BleSensor error handling', () => {
  beforeEach(() => {
    window.confirm = jest.fn().mockReturnValue(true);
    (navigator as any).bluetooth = {
      requestDevice: jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('No devices found'), {
          name: 'NotFoundError',
        }))
        .mockResolvedValueOnce({
          id: 'dev1',
          name: 'Device 1',
          gatt: {
            connect: jest.fn().mockResolvedValue({
              getPrimaryServices: jest.fn().mockResolvedValue([]),
            }),
          },
          addEventListener: jest.fn(),
        }),
    };
  });

  it('shows friendly error then connects on retry', async () => {
    const { getByText, queryByText } = render(React.createElement(BleSensor));
    fireEvent.click(getByText('Scan for Devices'));
    await waitFor(() => getByText('No devices found.'));
    expect(getByText('No devices found.')).toBeInTheDocument();

    await waitFor(() => expect(getByText('Scan for Devices')).toBeEnabled());
    fireEvent.click(getByText('Scan for Devices'));
    await waitFor(() => getByText('Connected to: Device 1'));
    expect(getByText('Connected to: Device 1')).toBeInTheDocument();
  });
});
