import React from 'react';
import { render, screen } from '@testing-library/react';
import QRScanner from '../components/apps/qr';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue(''),
  toString: jest.fn(),
}));

const originalMediaDevicesDescriptor = Object.getOwnPropertyDescriptor(
  globalThis.navigator,
  'mediaDevices',
);
const originalPermissionsDescriptor = Object.getOwnPropertyDescriptor(
  globalThis.navigator,
  'permissions',
);

const restoreNavigatorProperty = (
  key: 'mediaDevices' | 'permissions',
  descriptor: PropertyDescriptor | undefined,
) => {
  if (descriptor) {
    Object.defineProperty(globalThis.navigator, key, descriptor);
  } else {
    delete (globalThis.navigator as Record<string, unknown>)[key];
  }
};

const mockNavigatorProperty = (key: 'mediaDevices' | 'permissions', value: unknown) => {
  Object.defineProperty(globalThis.navigator, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
};

describe('QRScanner preflight', () => {
  let consoleWarn: jest.SpyInstance;
  let consoleInfo: jest.SpyInstance;

  beforeEach(() => {
    restoreNavigatorProperty('mediaDevices', originalMediaDevicesDescriptor);
    restoreNavigatorProperty('permissions', originalPermissionsDescriptor);
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarn.mockRestore();
    consoleInfo.mockRestore();
    restoreNavigatorProperty('mediaDevices', originalMediaDevicesDescriptor);
    restoreNavigatorProperty('permissions', originalPermissionsDescriptor);
  });

  it('blocks start when media devices API is missing', async () => {
    mockNavigatorProperty('mediaDevices', undefined);
    mockNavigatorProperty('permissions', undefined);

    render(<QRScanner />);

    await screen.findByText('Camera APIs are not available in this browser.');
    const startButton = screen.getByRole('button', { name: /start scanner/i });
    expect(startButton).toBeDisabled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[QR Scanner] Preflight diagnostics',
      expect.objectContaining({ hasMediaDevices: false, ready: false }),
    );
  });

  it('reports when no camera devices are found', async () => {
    const enumerateDevices = jest
      .fn()
      .mockResolvedValue([
        { kind: 'audioinput', deviceId: 'mic-1', label: 'Microphone' } as MediaDeviceInfo,
      ]);
    const getUserMedia = jest.fn();

    mockNavigatorProperty('mediaDevices', {
      enumerateDevices,
      getUserMedia,
    });

    const permissionStatus = {
      state: 'granted' as PermissionState,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as PermissionStatus;

    mockNavigatorProperty('permissions', {
      query: jest.fn().mockResolvedValue(permissionStatus),
    });

    render(<QRScanner />);

    await screen.findByText('No camera detected.');
    expect(screen.getByRole('button', { name: /start scanner/i })).toBeDisabled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[QR Scanner] Preflight diagnostics',
      expect.objectContaining({ videoDeviceCount: 0, ready: false }),
    );
  });

  it('blocks start when camera permission is denied', async () => {
    const enumerateDevices = jest
      .fn()
      .mockResolvedValue([
        { kind: 'videoinput', deviceId: 'cam-1', label: 'Camera' } as MediaDeviceInfo,
      ]);
    const getUserMedia = jest.fn();

    mockNavigatorProperty('mediaDevices', {
      enumerateDevices,
      getUserMedia,
    });

    const permissionStatus = {
      state: 'denied' as PermissionState,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as PermissionStatus;

    mockNavigatorProperty('permissions', {
      query: jest.fn().mockResolvedValue(permissionStatus),
    });

    render(<QRScanner />);

    await screen.findByText('Camera access has been denied.');
    const startButton = screen.getByRole('button', { name: /start scanner/i });
    expect(startButton).toBeDisabled();
    expect(consoleWarn).toHaveBeenCalledWith(
      '[QR Scanner] Preflight diagnostics',
      expect.objectContaining({ permissionState: 'denied', ready: false }),
    );
  });
});
