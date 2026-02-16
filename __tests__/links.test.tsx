import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LinksPage from '../pages/links';
import QRCode from 'qrcode';

jest.mock('qrcode');

describe('Links page', () => {
  beforeEach(() => {
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,abc');
  });

  it('renders links with notes and generates a QR code', async () => {
    render(<LinksPage />);
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(
      screen.getByText('Open-source projects & contributions.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalled();
    });
  });
});
