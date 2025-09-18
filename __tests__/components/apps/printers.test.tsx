import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrintersApp from '../../../components/apps/printers';
import QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,qr')),
}));

describe('Printers app manual add flow', () => {
  beforeEach(() => {
    (QRCode.toDataURL as jest.Mock).mockClear();
  });

  it('walks through manual add and driver selection', async () => {
    render(<PrintersApp />);

    fireEvent.click(screen.getByRole('tab', { name: /manual add/i }));

    fireEvent.change(screen.getByLabelText(/Printer name/i), {
      target: { value: 'Lab Printer' },
    });
    fireEvent.change(screen.getByLabelText(/IP address/i), {
      target: { value: '10.0.5.200' },
    });
    fireEvent.change(screen.getByLabelText(/Location/i), {
      target: { value: 'Purple lab' },
    });
    fireEvent.change(screen.getByLabelText(/Model/i), {
      target: { value: 'Brother HL-L8360CDW' },
    });
    fireEvent.change(screen.getByLabelText(/Queue name/i), {
      target: { value: 'lab-queue' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue to drivers/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /Driver catalog/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Install Brother BR-Script3 Driver/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: /Print test page/i }),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Close preview/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Generate test page/i }),
      ).toBeInTheDocument(),
    );
  });
});
