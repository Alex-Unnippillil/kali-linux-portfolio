import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import PkceHelper from '@apps/pkce-helper';

describe('PkceHelper', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('computes S256 challenge for test vectors', async () => {
    const vectors = [
      {
        verifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      },
      {
        verifier:
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~',
        challenge: 'ImpiCd8pp4MveCNnbIS7-GXEtB0xF5HMIDoWqvGA5ig',
      },
      {
        verifier: 'a'.repeat(128),
        challenge: 'aDbPE7rEAOkQUHHNavRwhN-srU5eMCyUv-0k4BOvtz4',
      },
    ];
    const { getByTestId } = render(<PkceHelper />);
    for (const v of vectors) {
      fireEvent.change(getByTestId('verifier'), { target: { value: v.verifier } });
      // wait for challenge update
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(getByTestId('challenge')).toHaveValue(v.challenge));
    }
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

  it('shows error for invalid verifier', () => {
    const { getByTestId } = render(<PkceHelper />);
    fireEvent.change(getByTestId('verifier'), { target: { value: 'abc+' } });
    expect(getByTestId('verifier-error')).toHaveTextContent('Verifier must');
  });

  it('loads persisted values', () => {
    window.localStorage.setItem('pkce-verifier', 'saved');
    window.localStorage.setItem('pkce-state', 'persist');
    const { getByTestId } = render(<PkceHelper />);
    expect(getByTestId('verifier')).toHaveValue('saved');
    expect(getByTestId('state')).toHaveValue('persist');
  });
});

