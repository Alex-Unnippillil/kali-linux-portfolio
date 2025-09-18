import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QR from '../../../apps/qr';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toCanvas: jest.fn(() => Promise.resolve()),
    toString: jest.fn(() => Promise.resolve('<svg></svg>')),
  },
}));


beforeAll(() => {
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    value: jest.fn(() => ({
      clearRect: jest.fn(),
      drawImage: jest.fn(),
    })),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('QR styling controls', () => {
  it('shows a warning when the contrast ratio falls below WCAG guidance', async () => {
    render(<QR />);

    const foregroundInput = screen.getByLabelText('Foreground color') as HTMLInputElement;
    const backgroundInput = screen.getByLabelText('Background color') as HTMLInputElement;

    expect(foregroundInput.value).toBe('#000000');
    expect(backgroundInput.value).toBe('#ffffff');

    fireEvent.change(foregroundInput, { target: { value: '#ffffff' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Warning: Low contrast may impact scanning/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Contrast ratio 1.00:1/i)).toBeInTheDocument();
  });

  it('persists styling preferences via safeLocalStorage and hydrates on load', async () => {
    const { unmount } = render(<QR />);

    fireEvent.change(screen.getByLabelText('Size'), { target: { value: '512' } });
    fireEvent.change(screen.getByLabelText('Margin'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('ECC'), { target: { value: 'H' } });
    fireEvent.change(screen.getByLabelText('Foreground color'), {
      target: { value: '#ff0000' },
    });
    fireEvent.change(screen.getByLabelText('Background color'), {
      target: { value: '#00ff00' },
    });

    await waitFor(() => {
      const storedRaw = localStorage.getItem('qr-style-preferences');
      expect(storedRaw).not.toBeNull();
      const stored = JSON.parse(storedRaw ?? '{}');
      expect(stored).toMatchObject({
        size: 512,
        margin: 4,
        ecc: 'H',
        foregroundColor: '#ff0000',
        backgroundColor: '#00ff00',
      });
    });

    unmount();

    render(<QR />);

    await waitFor(() => {
      expect((screen.getByLabelText('Size') as HTMLSelectElement).value).toBe('512');
    });

    expect((screen.getByLabelText('Margin') as HTMLSelectElement).value).toBe('4');
    expect((screen.getByLabelText('ECC') as HTMLSelectElement).value).toBe('H');
    expect((screen.getByLabelText('Foreground color') as HTMLInputElement).value).toBe(
      '#ff0000',
    );
    expect((screen.getByLabelText('Background color') as HTMLInputElement).value).toBe(
      '#00ff00',
    );
  });
});
