import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import QRTool from '@components/apps/qr_tool';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

jest.mock('qrcode', () => ({
  toCanvas: jest.fn().mockResolvedValue(undefined),
  toString: jest.fn().mockResolvedValue('<svg></svg>'),
}));

jest.mock('qr-scanner', () => ({
  scanImage: jest.fn().mockResolvedValue({ data: 'scanned data' }),
  default: function () {
    return { start: jest.fn(), stop: jest.fn() } as any;
  },
}));

describe('QR Tool', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:mock');
    // force decode to fail so fallback path is used
    // @ts-ignore
    global.Image.prototype.decode = jest
      .fn()
      .mockRejectedValue(new Error('fail'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('applies custom colors when generating', async () => {
    render(<QRTool />);
    fireEvent.change(screen.getByPlaceholderText('Enter text'), {
      target: { value: 'hello' },
    });
    fireEvent.change(screen.getByLabelText('Foreground'), {
      target: { value: '#ff0000' },
    });
    fireEvent.change(screen.getByLabelText('Background'), {
      target: { value: '#00ff00' },
    });
    await act(async () => {
      jest.runAllTimers();
    });
    await waitFor(() => {
      expect(QRCode.toCanvas).toHaveBeenCalledWith(
        expect.anything(),
        'hello',
        expect.objectContaining({
          color: { dark: '#ff0000', light: '#00ff00' },
        })
      );
    });
  });

  it('copies decoded text to clipboard', async () => {
    render(<QRTool />);
    const file = new File(['data'], 'qr.png', { type: 'image/png' });
    const input = screen.getByLabelText('QR file');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText(/Decoded:/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('Copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('scanned data');
  });
});
