import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SshManager from '@/components/apps/ssh-manager';
import { sshAgentMock } from '@/utils/sshAgentMock';
import { get, set } from 'idb-keyval';
import { trackEvent } from '@/lib/analytics-client';

jest.mock('idb-keyval', () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('@/lib/analytics-client', () => ({
  trackEvent: jest.fn(),
}));

describe('SSH Manager app', () => {
  beforeAll(() => {
    const { webcrypto } = require('crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: false,
    });
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      configurable: true,
      writable: false,
    });
  });

  beforeEach(() => {
    (get as jest.Mock).mockResolvedValue([]);
    (set as jest.Mock).mockResolvedValue(undefined);
    (trackEvent as jest.Mock).mockClear();
    sshAgentMock.reset();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generates a new Ed25519 key and persists encrypted metadata', async () => {
    render(<SshManager />);

    const [generateCommentField] = screen.getAllByLabelText(/Key comment/i);
    const generatePassphrase = screen.getByLabelText(/Passphrase \(recommended\)/i);

    fireEvent.change(generateCommentField, { target: { value: 'lab-key' } });
    fireEvent.change(generatePassphrase, { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate key/i }));

    await waitFor(() => expect(set).toHaveBeenCalled());

    const stored = (set as jest.Mock).mock.calls[0][1] as any[];
    expect(stored).toHaveLength(1);
    expect(stored[0].comment).toBe('lab-key');
    expect(stored[0].publicKey).toMatch(/^ssh-ed25519 /);
    expect(stored[0].fingerprint).toMatch(/^SHA256:/);
    expect(stored[0].encryptedPrivateKey).toBeDefined();
    expect(stored[0].passphraseProtected).toBe(true);

    await screen.findByText('lab-key');
  });

  it('loads a stored key into the simulated agent after unlocking', async () => {
    render(<SshManager />);

    const [generateCommentField] = screen.getAllByLabelText(/Key comment/i);
    const generatePassphrase = screen.getByLabelText(/Passphrase \(recommended\)/i);

    fireEvent.change(generateCommentField, { target: { value: 'ops-key' } });
    fireEvent.change(generatePassphrase, { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate key/i }));

    await waitFor(() => expect(screen.getByText('ops-key')).toBeInTheDocument());

    const passphraseField = await screen.findByPlaceholderText(/Enter passphrase/i);
    fireEvent.change(passphraseField, { target: { value: 'hunter2' } });

    fireEvent.click(screen.getByRole('button', { name: /Load into agent/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remove from agent/i })).toBeInTheDocument(),
    );
    expect(sshAgentMock.listKeys()).toHaveLength(1);
  });

  it('copies the public key and clears the copied state after the timeout', async () => {
    render(<SshManager />);

    const [generateCommentField] = screen.getAllByLabelText(/Key comment/i);
    fireEvent.change(generateCommentField, { target: { value: 'copy-key' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate key/i }));

    await waitFor(() => expect(set).toHaveBeenCalled());
    await screen.findByText('copy-key');

    jest.useFakeTimers();

    fireEvent.click(screen.getByRole('button', { name: /Copy public key/i }));

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('ssh_public_key_copied', expect.any(Object)));
    expect((navigator.clipboard.writeText as jest.Mock)).toHaveBeenCalled();
    expect(screen.getByText('Copied!')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(screen.getByRole('button', { name: /Copy public key/i })).toBeInTheDocument();
    jest.useRealTimers();
  });
});
