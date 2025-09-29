'use client';

import React, { useMemo } from 'react';

export const algorithmFields = [
  { id: 'kex', label: 'Key exchange (KexAlgorithms)' },
  { id: 'hostKey', label: 'Host key (HostKeyAlgorithms)' },
  { id: 'cipher', label: 'Cipher (-c)' },
  { id: 'mac', label: 'Message authentication (MACs)' },
] as const;

export type AlgorithmCategory = (typeof algorithmFields)[number]['id'];

export type SelectionState = Partial<Record<AlgorithmCategory, string | undefined>>;

export const algorithmLibrary: Record<AlgorithmCategory, string[]> = {
  kex: [
    'sntrup761x25519-sha512@openssh.com',
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha1',
  ],
  hostKey: [
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
  ],
  cipher: [
    'chacha20-poly1305@openssh.com',
    'aes256-gcm@openssh.com',
    'aes128-gcm@openssh.com',
    'aes256-ctr',
    'aes128-ctr',
    'aes128-cbc',
    '3des-cbc',
  ],
  mac: [
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256-etm@openssh.com',
    'umac-128-etm@openssh.com',
    'hmac-sha2-512',
    'hmac-sha2-256',
    'hmac-sha1',
    'hmac-md5',
  ],
};

export interface OSProfile {
  name: string;
  release: string;
  algorithms: Record<AlgorithmCategory, string[]>;
  recommended?: Partial<Record<AlgorithmCategory, string[]>>;
  notes?: string[];
}

export const osProfiles = {
  'ubuntu-22-04': {
    name: 'Ubuntu 22.04 LTS',
    release: 'OpenSSH 8.9p1',
    algorithms: {
      kex: [
        'sntrup761x25519-sha512@openssh.com',
        'curve25519-sha256',
        'curve25519-sha256@libssh.org',
        'ecdh-sha2-nistp256',
        'ecdh-sha2-nistp384',
      ],
      hostKey: [
        'ssh-ed25519',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp384',
        'rsa-sha2-512',
        'rsa-sha2-256',
      ],
      cipher: [
        'chacha20-poly1305@openssh.com',
        'aes256-gcm@openssh.com',
        'aes128-gcm@openssh.com',
        'aes256-ctr',
        'aes128-ctr',
      ],
      mac: [
        'hmac-sha2-512-etm@openssh.com',
        'hmac-sha2-256-etm@openssh.com',
        'umac-128-etm@openssh.com',
      ],
    },
    recommended: {
      kex: ['sntrup761x25519-sha512@openssh.com', 'curve25519-sha256'],
      hostKey: ['ssh-ed25519'],
      cipher: ['chacha20-poly1305@openssh.com', 'aes256-gcm@openssh.com'],
      mac: ['hmac-sha2-512-etm@openssh.com'],
    },
    notes: [
      'Modern OpenSSH defaults already prefer sntrup and curve25519 key exchange.',
      'Legacy RSA-SHA1 and MD5 algorithms are disabled.',
    ],
  } satisfies OSProfile,
  'debian-10': {
    name: 'Debian 10 Buster',
    release: 'OpenSSH 7.9p1',
    algorithms: {
      kex: [
        'curve25519-sha256',
        'curve25519-sha256@libssh.org',
        'ecdh-sha2-nistp256',
        'diffie-hellman-group-exchange-sha256',
      ],
      hostKey: [
        'ssh-ed25519',
        'ecdsa-sha2-nistp256',
        'rsa-sha2-512',
        'rsa-sha2-256',
      ],
      cipher: [
        'chacha20-poly1305@openssh.com',
        'aes256-gcm@openssh.com',
        'aes128-gcm@openssh.com',
        'aes256-ctr',
        'aes128-ctr',
      ],
      mac: [
        'hmac-sha2-512-etm@openssh.com',
        'hmac-sha2-256-etm@openssh.com',
        'umac-128-etm@openssh.com',
        'hmac-sha2-512',
        'hmac-sha2-256',
      ],
    },
    recommended: {
      kex: ['curve25519-sha256'],
      hostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256'],
      cipher: ['chacha20-poly1305@openssh.com', 'aes256-gcm@openssh.com'],
      mac: ['hmac-sha2-512-etm@openssh.com'],
    },
    notes: [
      'GCM and chacha20 ciphers are available, but sntrup key exchange arrived in newer releases.',
      'Older HMACs remain for backward compatibility; prefer the -etm variants when possible.',
    ],
  } satisfies OSProfile,
  'rhel-7': {
    name: 'RHEL / CentOS 7',
    release: 'OpenSSH 7.4p1',
    algorithms: {
      kex: [
        'curve25519-sha256',
        'ecdh-sha2-nistp256',
        'diffie-hellman-group-exchange-sha256',
        'diffie-hellman-group14-sha1',
      ],
      hostKey: [
        'ecdsa-sha2-nistp256',
        'rsa-sha2-512',
        'rsa-sha2-256',
        'ssh-rsa',
      ],
      cipher: ['aes256-ctr', 'aes128-ctr', 'aes128-cbc', '3des-cbc'],
      mac: ['hmac-sha2-512', 'hmac-sha2-256', 'hmac-sha1'],
    },
    recommended: {
      kex: ['curve25519-sha256', 'ecdh-sha2-nistp256'],
      hostKey: ['ecdsa-sha2-nistp256', 'rsa-sha2-512'],
      cipher: ['aes256-ctr', 'aes128-ctr'],
      mac: ['hmac-sha2-512', 'hmac-sha2-256'],
    },
    notes: [
      'Chacha20 and GCM ciphers are not present until newer OpenSSH releases.',
      'RSA-SHA1 and MD5 HMACs may still exist but should be avoided if FIPS is enabled.',
    ],
  } satisfies OSProfile,
  'alpine-3-17': {
    name: 'Alpine 3.17',
    release: 'Dropbear 2022.82',
    algorithms: {
      kex: ['curve25519-sha256', 'ecdh-sha2-nistp256', 'diffie-hellman-group14-sha1'],
      hostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256'],
      cipher: ['chacha20-poly1305@openssh.com', 'aes256-ctr', 'aes128-ctr'],
      mac: ['hmac-sha2-256', 'hmac-sha1'],
    },
    recommended: {
      kex: ['curve25519-sha256'],
      hostKey: ['ssh-ed25519'],
      cipher: ['chacha20-poly1305@openssh.com'],
      mac: ['hmac-sha2-256'],
    },
    notes: [
      'Dropbear ships a smaller algorithm set; stick to curve25519 or diffie-hellman-group14.',
      'Only CTR or chacha20 ciphers are compiled in by default.',
    ],
  } satisfies OSProfile,
  'windows-2019': {
    name: 'Windows Server 2019',
    release: 'Win32-OpenSSH 8.1',
    algorithms: {
      kex: ['curve25519-sha256', 'ecdh-sha2-nistp256', 'diffie-hellman-group14-sha1'],
      hostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512'],
      cipher: ['aes256-gcm@openssh.com', 'aes128-gcm@openssh.com', 'aes256-ctr', 'aes128-ctr'],
      mac: ['hmac-sha2-512-etm@openssh.com', 'hmac-sha2-256-etm@openssh.com'],
    },
    recommended: {
      kex: ['curve25519-sha256'],
      hostKey: ['ecdsa-sha2-nistp256', 'ssh-ed25519'],
      cipher: ['aes256-gcm@openssh.com', 'aes128-gcm@openssh.com'],
      mac: ['hmac-sha2-512-etm@openssh.com'],
    },
    notes: [
      'Win32-OpenSSH inherits most OpenSSH defaults but lacks sntrup hybrids.',
      'Legacy SSH-RSA is disabled when the system enforces modern cryptography policies.',
    ],
  } satisfies OSProfile,
} satisfies Record<string, OSProfile>;

export type ProfileKey = keyof typeof osProfiles;

export interface CategoryAssessment {
  category: AlgorithmCategory;
  selected?: string;
  isCompatible: boolean;
  supported: string[];
  alternatives: string[];
}

const fieldLabels = algorithmFields.reduce<Record<AlgorithmCategory, string>>((acc, field) => {
  acc[field.id] = field.label;
  return acc;
}, {} as Record<AlgorithmCategory, string>);

const unique = (values: string[]) => Array.from(new Set(values));

export function assessCompatibility(profileKey: ProfileKey, selection: SelectionState): CategoryAssessment[] {
  const profile = osProfiles[profileKey];
  return algorithmFields.map((field) => {
    const supported = profile.algorithms[field.id] ?? [];
    const selected = selection[field.id];
    const isCompatible = !selected || supported.includes(selected);
    const preferred = profile.recommended?.[field.id] ?? [];
    const alternatives = !isCompatible
      ? unique([...preferred, ...supported]).filter((alg) => alg !== selected).slice(0, 4)
      : [];

    return {
      category: field.id,
      selected: selected ?? undefined,
      isCompatible,
      supported,
      alternatives,
    };
  });
}

interface CompatHintsProps {
  profileKey: ProfileKey;
  selection: SelectionState;
}

const CompatHints: React.FC<CompatHintsProps> = ({ profileKey, selection }) => {
  const profile = osProfiles[profileKey];

  const assessments = useMemo(() => assessCompatibility(profileKey, selection), [profileKey, selection]);
  const warnings = assessments.filter((item) => item.selected && !item.isCompatible);
  const hasSelection = algorithmFields.some((field) => !!selection[field.id]);

  if (!profile) {
    return null;
  }

  return (
    <section aria-live="polite" className="mt-6 border-t border-gray-800 pt-4">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-sky-200">Compatibility hints</h3>
        <p className="text-xs uppercase tracking-wide text-slate-300">
          {profile.name} · {profile.release}
        </p>
      </header>

      {warnings.length > 0 ? (
        <div className="mt-3 space-y-3">
          {warnings.map((warning) => (
            <div
              key={warning.category}
              className="rounded border border-yellow-500/70 bg-yellow-950/40 p-3 text-yellow-100"
            >
              <p className="font-medium text-yellow-200">{fieldLabels[warning.category]}</p>
              <p className="text-sm">
                <code className="rounded bg-black/50 px-1 py-0.5 text-xs">{warning.selected}</code> is not
                available on {profile.name}.
              </p>
              {warning.alternatives.length > 0 && (
                <p className="text-sm">
                  Try{' '}
                  {warning.alternatives.map((alt, index) => (
                    <React.Fragment key={alt}>
                      {index > 0 ? ', ' : ''}
                      <code className="rounded bg-black/50 px-1 py-0.5 text-xs">{alt}</code>
                    </React.Fragment>
                  ))}
                  .
                </p>
              )}
            </div>
          ))}
        </div>
      ) : hasSelection ? (
        <div className="mt-3 rounded border border-emerald-600/60 bg-emerald-900/30 p-3 text-emerald-100">
          <p className="font-medium text-emerald-200">All selected algorithms are supported.</p>
          <p className="text-xs text-emerald-100/80">{profile.release}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-300">
          Select algorithms above to verify their compatibility with {profile.name}.
        </p>
      )}

      {profile.notes?.length ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">
          {profile.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

export default CompatHints;
