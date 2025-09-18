import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import JwtDebugger from '@/apps/crypto-toolkit/components/JwtDebugger';

describe('JwtDebugger', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  });

  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.' +
    'TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

  const tamperedToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOmZhbHNlfQ.' +
    'TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ';

  it('verifies valid HS256 signatures', async () => {
    render(<JwtDebugger />);

    fireEvent.change(screen.getByLabelText(/jwt token/i), {
      target: { value: validToken },
    });

    fireEvent.change(screen.getByLabelText(/shared secret/i), {
      target: { value: 'secret' },
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Signature verified with HS256.'
      )
    );

    expect(screen.getByText(/Computed Signature/i)).toBeInTheDocument();
    expect(screen.getByText(/Token Signature/i)).toBeInTheDocument();
  });

  it('flags tampered tokens', async () => {
    render(<JwtDebugger />);

    fireEvent.change(screen.getByLabelText(/jwt token/i), {
      target: { value: tamperedToken },
    });

    fireEvent.change(screen.getByLabelText(/shared secret/i), {
      target: { value: 'secret' },
    });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Signature mismatch for HS256 verification.'
      )
    );
  });
});
