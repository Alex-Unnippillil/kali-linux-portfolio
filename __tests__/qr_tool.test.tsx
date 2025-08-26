import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import QRTool from '../components/apps/qr_tool';
import QRCode from 'qrcode';

jest.mock('qrcode', () => {
  const toCanvas = jest.fn(() => Promise.resolve());
  return { __esModule: true, default: { toCanvas } };
});

describe('QRTool', () => {
  const mockedToCanvas = (QRCode as any).toCanvas as jest.Mock;

  beforeEach(() => {
    mockedToCanvas.mockClear();
  });

  it('passes selected error correction level', async () => {
    render(<QRTool />);
    fireEvent.change(screen.getByLabelText('Text to encode'), {
      target: { value: 'hello' },
    });
    fireEvent.change(screen.getByLabelText('Error correction level'), {
      target: { value: 'H' },
    });
    fireEvent.click(screen.getByText('Generate'));
    await waitFor(() =>
      expect(mockedToCanvas).toHaveBeenCalledWith(
        expect.anything(),
        'hello',
        expect.objectContaining({ errorCorrectionLevel: 'H' })
      )
    );
  });

  it('generates multiple codes from batch input', async () => {
    render(<QRTool />);
    fireEvent.change(screen.getByLabelText('Batch text'), {
      target: { value: 'a\nb' },
    });
    fireEvent.click(screen.getByText('Generate Batch'));
    await waitFor(() => expect(mockedToCanvas).toHaveBeenCalledTimes(2));
    const imgs = await screen.findAllByAltText(/QR code for/);
    expect(imgs).toHaveLength(2);
  });
});
