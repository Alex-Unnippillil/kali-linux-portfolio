import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TLSViewer from '../apps/tls-viewer';

const SAMPLE_S_CLIENT_OUTPUT = `
Protocol  : TLSv1.3
Cipher    : TLS_AES_256_GCM_SHA384
Server Temp Key: X25519

Server certificate
subject=CN = *.Example.Com

Subject Alternative Name:
    DNS:*.Example.Com, DNS:WWW.Example.Com

Issuer: CN=Example Root CA
`;

const renderAndParseTls = () => {
  render(<TLSViewer />);

  fireEvent.change(screen.getByPlaceholderText(/openssl s_client output/i), {
    target: { value: SAMPLE_S_CLIENT_OUTPUT },
  });
  fireEvent.click(screen.getByRole('button', { name: /parse/i }));

  return screen.getByLabelText(/expected hostname/i) as HTMLInputElement;
};

describe('TLS Viewer hostname validation', () => {
  it('does not show warnings when the expected host matches SAN or CN entries', async () => {
    const hostInput = renderAndParseTls();

    fireEvent.change(hostInput, { target: { value: 'API.EXAMPLE.COM' } });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows SAN and CN mismatch warnings when the expected host is not covered', async () => {
    const hostInput = renderAndParseTls();

    fireEvent.change(hostInput, { target: { value: 'deep.api.example.com' } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Hostname validation failed');

    const warnings = within(alert).getAllByRole('listitem');
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toHaveTextContent(
      'SAN DNS mismatch: deep.api.example.com is not covered by *.Example.Com, WWW.Example.Com',
    );
    expect(warnings[1]).toHaveTextContent(
      'Legacy CN mismatch: certificate CN *.Example.Com does not match deep.api.example.com.',
    );
  });

  it('clears hostname warnings when the expected host input is emptied', async () => {
    const hostInput = renderAndParseTls();

    fireEvent.change(hostInput, { target: { value: 'deep.api.example.com' } });
    await screen.findByRole('alert');

    fireEvent.change(hostInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
