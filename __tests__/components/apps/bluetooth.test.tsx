import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import BleSensor from '../../../components/apps/ble-sensor';
import QuickSettings from '../../../components/ui/QuickSettings';
import { installBluetoothMock, MockBluetoothDevice } from '../../../utils/bluetoothMock';
import {
  __resetBluetoothStateForTests,
  getBluetoothState,
  retryPairing,
} from '../../../utils/bluetoothManager';

describe('Bluetooth experience', () => {
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    window.localStorage.clear();
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    __resetBluetoothStateForTests();
  });

  const setupBluetooth = (
    options?: Parameters<typeof installBluetoothMock>[0]
  ): MockBluetoothDevice => {
    const { device } = installBluetoothMock(options);
    __resetBluetoothStateForTests();
    return device;
  };

  it('progresses through pairing steps and surfaces battery level', async () => {
    setupBluetooth({ batteryLevel: 78 });
    render(<BleSensor />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /scan for devices/i }));
    });

    const battery = await screen.findByTestId('battery-level');
    const readyStep = screen.getByTestId('pairing-step-complete');
    expect(readyStep).toHaveTextContent(/Ready/i);
    expect(battery).toHaveTextContent(/Battery 78%/i);

    const services = await screen.findByTestId('service-list');
    expect(services.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(getBluetoothState().status).toBe('connected');
  });

  it('allows retry after a failed connection attempt', async () => {
    setupBluetooth({ failConnectAttempts: 3 });
    render(<BleSensor />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /scan for devices/i }));
    });

    const alert = await screen.findByRole('alert', undefined, { timeout: 4000 });
    expect(alert).toHaveTextContent(/retry/i);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry pairing/i }));
    });

    await screen.findByTestId('battery-level');
    expect(getBluetoothState().status).toBe('connected');
  });

  it('reuses cached state when reconnecting after a disconnect', async () => {
    const device = setupBluetooth({ batteryLevel: 64 });
    render(
      <>
        <BleSensor />
        <QuickSettings open />
      </>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /scan for devices/i }));
    });
    await screen.findByTestId('battery-level');

    expect(window.localStorage.getItem('ble:lastDeviceId')).toBe(device.id);

    await screen.findByText(/Connected and streaming cached data./i);

    await act(async () => {
      device.simulateDisconnect();
    });

    await act(async () => {
      await retryPairing();
    });
    await waitFor(() => {
      expect(getBluetoothState().status).toBe('connected');
    });

    const state = getBluetoothState();
    expect(state.status).toBe('connected');
    expect(state.services.length).toBeGreaterThan(0);
  });
});
