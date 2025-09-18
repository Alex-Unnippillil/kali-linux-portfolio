import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SSHPreview from '../../../apps/ssh';

beforeAll(() => {
  if (!(global as any).crypto || !(global as any).crypto.subtle) {
    const { webcrypto } = require('crypto');
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  }
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('SSH connection manager', () => {
  it('creates a profile and persists it', async () => {
    const user = userEvent.setup();

    render(<SSHPreview />);

    await screen.findByText(/SSH Connection Manager/i);

    await user.clear(screen.getByLabelText(/Hostname or IP/i));
    await user.type(screen.getByLabelText(/Hostname or IP/i), 'prod.example.com');
    await user.clear(screen.getByLabelText(/Profile name/i));
    await user.type(screen.getByLabelText(/Profile name/i), 'Prod Server');

    await user.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Prod Server/i })).toBeInTheDocument(),
    );

    const stored = window.localStorage.getItem('ssh:profiles');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed).toHaveProperty('data');
  });

  it('prompts to trust new fingerprints before launching a session', async () => {
    const user = userEvent.setup();

    render(<SSHPreview />);

    await user.clear(screen.getByLabelText(/Hostname or IP/i));
    await user.type(screen.getByLabelText(/Hostname or IP/i), 'secure.internal');
    await user.clear(screen.getByLabelText(/Profile name/i));
    await user.type(screen.getByLabelText(/Profile name/i), 'Secure Host');
    await user.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Secure Host/i })).toBeInTheDocument(),
    );

    await user.clear(screen.getByLabelText(/Host fingerprint/i));
    await user.type(screen.getByLabelText(/Host fingerprint/i), 'SHA256:trustme');
    await user.click(screen.getByRole('button', { name: /Connect/i }));

    const trustModal = await screen.findByRole('dialog');
    expect(trustModal).toHaveTextContent(/Trust unknown host/i);
    expect(trustModal).toHaveTextContent('SHA256:trustme');

    await user.click(screen.getByRole('button', { name: /Trust and Connect/i }));

    if (trustModal.isConnected) {
      await waitForElementToBeRemoved(trustModal);
    }
    await screen.findByText(/Established encrypted channel/i);
    const fingerprintSection = screen.getByText(/Trusted fingerprints/i).closest('div');
    expect(fingerprintSection).toBeTruthy();
    expect(within(fingerprintSection as HTMLElement).getAllByText('SHA256:trustme').length).toBeGreaterThan(0);
  });

  it('supports quick-connect sessions without saving profiles', async () => {
    const user = userEvent.setup();

    render(<SSHPreview />);

    await screen.findByText(/SSH Connection Manager/i);

    await user.clear(screen.getByLabelText(/Hostname or IP/i));
    await user.type(screen.getByLabelText(/Hostname or IP/i), 'jump-box');
    await user.clear(screen.getByLabelText(/Username/i));
    await user.type(screen.getByLabelText(/Username/i), 'root');
    await user.clear(screen.getByLabelText(/Host fingerprint/i));
    await user.type(screen.getByLabelText(/Host fingerprint/i), 'SHA256:quickstart');

    await user.click(screen.getByRole('button', { name: /Quick Connect/i }));

    const quickModal = await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /Trust and Connect/i }));

    if (quickModal.isConnected) {
      await waitForElementToBeRemoved(quickModal);
    }
    await screen.findByRole('tab', { name: /jump-box/i });
    expect(window.localStorage.getItem('ssh:profiles')).toBeNull();
  });
});

