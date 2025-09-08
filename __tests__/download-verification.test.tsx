import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerifyDownloadPage from '../pages/verify-download';

jest.mock('../lib/hash-utils', () => ({
  sha256File: jest.fn().mockResolvedValue('abc123'),
}));

describe('VerifyDownloadPage', () => {
  it('computes checksum and verifies match', async () => {
    render(<VerifyDownloadPage />);

    expect(
      screen.getByRole('heading', { name: /sha256 checksum/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /signature verification/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('expected-input'), {
      target: { value: 'abc123' },
    });

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [file] },
    });

    expect(await screen.findByTestId('computed-hash')).toHaveTextContent(
      'abc123',
    );
    expect(await screen.findByText(/hashes match/i)).toBeInTheDocument();
  });
});
