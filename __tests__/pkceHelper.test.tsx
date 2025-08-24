import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PkceHelper from '@apps/pkce-helper';

describe('PkceHelper', () => {
  it('computes S256 challenge', async () => {
    const { getByTestId } = render(<PkceHelper />);
    fireEvent.change(getByTestId('verifier'), {
      target: { value: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' },
    });
    await waitFor(() =>
      expect(getByTestId('challenge')).toHaveValue(
        'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      ),
    );
  });

  it('verifies callback state', () => {
    const { getByTestId } = render(<PkceHelper />);
    fireEvent.change(getByTestId('state'), { target: { value: 'abc123' } });
    fireEvent.change(getByTestId('callback-input'), {
      target: {
        value: 'https://example.com/cb?code=foo&state=abc123',
      },
    });
    fireEvent.click(getByTestId('verify-btn'));
    expect(getByTestId('verify-result')).toHaveTextContent('State valid');
  });
});

