import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QR from '../apps/qr';
import QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toCanvas: jest.fn(() => Promise.resolve()),
  toString: jest.fn(() => Promise.resolve('<svg></svg>')),
}));

describe('QR app generator', () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates the canvas when the payload changes', async () => {
    render(<QR />);

    fireEvent.change(screen.getByLabelText('Text'), {
      target: { value: 'hello world' },
    });

    await waitFor(() => {
      expect(QRCode.toCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        'hello world',
        expect.objectContaining({ width: 256 }),
      );
    });
  });

  it('renders the preview toolbar in generate mode', () => {
    render(<QR />);

    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeInTheDocument();
    expect(
      screen.getAllByText(/Download or share this code, then open your phone camera/i).length,
    ).toBeGreaterThan(0);
  });
});
