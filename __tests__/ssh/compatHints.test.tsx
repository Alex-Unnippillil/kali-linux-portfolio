import React from 'react';
import { render, screen } from '@testing-library/react';
import CompatHints, {
  ProfileKey,
  SelectionState,
  assessCompatibility,
  osProfiles,
} from '../../apps/ssh/components/CompatHints';

describe('CompatHints knowledge base', () => {
  it('confirms compatibility for modern OpenSSH defaults', () => {
    const selection: SelectionState = {
      kex: 'curve25519-sha256',
      hostKey: 'ssh-ed25519',
      cipher: 'chacha20-poly1305@openssh.com',
      mac: 'hmac-sha2-512-etm@openssh.com',
    };
    const result = assessCompatibility('ubuntu-22-04', selection);
    expect(result.every((entry) => entry.isCompatible)).toBe(true);
  });

  it('suggests alternatives when newer algorithms miss older OpenSSH builds', () => {
    const selection: SelectionState = {
      cipher: 'chacha20-poly1305@openssh.com',
      mac: 'hmac-md5',
    };
    const result = assessCompatibility('rhel-7', selection);
    const cipherStatus = result.find((entry) => entry.category === 'cipher');
    const macStatus = result.find((entry) => entry.category === 'mac');

    expect(cipherStatus?.isCompatible).toBe(false);
    expect(cipherStatus?.alternatives).toContain('aes256-ctr');
    expect(macStatus?.isCompatible).toBe(false);
    expect(macStatus?.alternatives).toContain('hmac-sha2-256');
  });

  it('captures Dropbear limitations for curve25519 hybrids', () => {
    const selection: SelectionState = {
      kex: 'sntrup761x25519-sha512@openssh.com',
      hostKey: 'rsa-sha2-512',
    };
    const result = assessCompatibility('alpine-3-17', selection);
    const kexStatus = result.find((entry) => entry.category === 'kex');
    const hostKeyStatus = result.find((entry) => entry.category === 'hostKey');

    expect(kexStatus?.isCompatible).toBe(false);
    expect(kexStatus?.alternatives).toContain('curve25519-sha256');
    expect(hostKeyStatus?.isCompatible).toBe(false);
    expect(hostKeyStatus?.alternatives).toContain('ssh-ed25519');
  });
});

describe('CompatHints component rendering', () => {
  const renderWithProfile = (profileKey: ProfileKey, selection: SelectionState) =>
    render(<CompatHints profileKey={profileKey} selection={selection} />);

  it('shows an encouragement when everything is supported', () => {
    const profileKey: ProfileKey = 'debian-10';
    const recommended = osProfiles[profileKey].recommended ?? {};
    const selection: SelectionState = {
      kex: recommended.kex?.[0],
      hostKey: recommended.hostKey?.[0],
      cipher: recommended.cipher?.[0],
      mac: recommended.mac?.[0],
    };

    renderWithProfile(profileKey, selection);
    expect(screen.getByText(/All selected algorithms are supported/i)).toBeInTheDocument();
    expect(screen.getAllByText(/OpenSSH 7.9p1/).length).toBeGreaterThan(0);
  });

  it('renders warnings with alternative suggestions', () => {
    renderWithProfile('windows-2019', { kex: 'sntrup761x25519-sha512@openssh.com' });
    expect(
      screen.getByText(/sntrup761x25519-sha512@openssh.com/i, { selector: 'code' })
    ).toBeInTheDocument();
    const suggestion = screen.getByText(/curve25519-sha256/i, { selector: 'code' });
    expect(suggestion).toBeInTheDocument();
    expect(screen.getByText(/not available on Windows Server 2019/i)).toBeInTheDocument();
  });

  it('prompts the user to select algorithms when none are chosen', () => {
    renderWithProfile('ubuntu-22-04', {});
    expect(screen.getByText(/Select algorithms above/i)).toBeInTheDocument();
  });
});
