import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GpgManager from '@/components/apps/gpg-manager';
import {
  resetMock,
  listKeys,
} from '@/utils/gpgMock';
import { simulateGeditEmailSigning } from '@/components/apps/gedit';

describe('GPG Manager app', () => {
  beforeEach(() => {
    resetMock();
  });

  const renderManager = () => render(<GpgManager />);

  it('shows seeded keys and allows trust updates', async () => {
    renderManager();
    await screen.findByText('Mock Maintainer');
    const selectors = await screen.findAllByLabelText('Trust level');
    fireEvent.change(selectors[0], { target: { value: 'ultimate' } });
    await waitFor(() => expect(selectors[0]).toHaveValue('ultimate'));
    await screen.findByText(/trust to ultimate/i);
  });

  it('creates a new key pair', async () => {
    renderManager();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Passphrase (optional)'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate key pair/i }));
    await screen.findByText(/Created key for test@example.com/i);
    await screen.findByText('Test User');
  });

  it('imports an armored key block', async () => {
    renderManager();
    const armored = [
      '-----BEGIN PGP PUBLIC KEY-----',
      'Name: Example Import',
      'Email: example@import.test',
      'Fingerprint: FEDCBA98765432100123456789ABCDEF01234567',
      'Trust: full',
      '-----END PGP PUBLIC KEY-----',
    ].join('\n');
    fireEvent.change(screen.getByLabelText('Armored key block'), {
      target: { value: armored },
    });
    fireEvent.click(screen.getByRole('button', { name: /Import key/i }));
    await screen.findByText(/Imported key for example@import.test/i);
    await screen.findByText('Example Import');
  });

  it('signs a message and displays the signature preview', async () => {
    renderManager();
    const keys = await listKeys();
    const first = keys[0];
    fireEvent.change(screen.getByLabelText('Signing key'), {
      target: { value: first.id },
    });
    fireEvent.change(screen.getByLabelText('Message to sign'), {
      target: { value: 'Hello from the integration test' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign message/i }));
    const signature = await screen.findByTestId('gpg-signature-output');
    expect(signature.textContent).toContain('BEGIN SIGNATURE');
  });

  it('exports public key data for sharing', async () => {
    renderManager();
    const buttons = await screen.findAllByRole('button', { name: /Export public key/i });
    fireEvent.click(buttons[0]);
    const output = await screen.findByTestId('gpg-export-output');
    expect(output).toHaveValue(expect.stringContaining('BEGIN PGP PUBLIC KEY'));
  });

  it('provides a Gedit signing stub for integration tests', async () => {
    const keys = await listKeys();
    const result = await simulateGeditEmailSigning('Hello signed world', {
      keyId: keys[0].id,
    });
    expect(result.signature).toContain('BEGIN PGP SIGNED MESSAGE');
    expect(result.signedMessage).toContain('SIGNED-BY');
    expect(result.key.email).toBe(keys[0].email);
  });
});
