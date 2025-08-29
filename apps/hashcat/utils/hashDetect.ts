export interface HashDefinition {
  name: string;
  regex: RegExp;
  description: string;
}

const hashDefinitions: HashDefinition[] = [
  {
    name: 'MD5',
    regex: /^[a-f0-9]{32}$/i,
    description: 'MD5 is a widely used 128-bit hash represented as 32 hexadecimal characters.',
  },
  {
    name: 'SHA1',
    regex: /^[a-f0-9]{40}$/i,
    description: 'SHA-1 produces a 160-bit hash typically rendered as 40 hexadecimal characters.',
  },
  {
    name: 'SHA256',
    regex: /^[a-f0-9]{64}$/i,
    description: 'SHA-256 is part of the SHA-2 family and outputs 64 hexadecimal characters.',
  },
  {
    name: 'SHA512',
    regex: /^[a-f0-9]{128}$/i,
    description: 'SHA-512, another SHA-2 variant, results in 128 hexadecimal characters.',
  },
  {
    name: 'bcrypt',
    regex: /^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/,
    description: 'bcrypt is an adaptive hash using the Blowfish cipher and includes cost and salt.',
  },
  {
    name: 'MySQL',
    regex: /^\*[A-F0-9]{40}$/,
    description: 'MySQL 4.1+ hashes start with an asterisk followed by 40 uppercase hex characters.',
  },
  {
    name: 'MySQL323',
    regex: /^[a-f0-9]{16}$/i,
    description: 'MySQL pre-4.1 (323) hashes are 16 hexadecimal characters.',
  },
  {
    name: 'CRC32',
    regex: /^[a-f0-9]{8}$/i,
    description: 'CRC32 checksums are 8 hexadecimal characters long.',
  },
  {
    name: 'UUID',
    regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    description: 'Universally Unique Identifiers (UUID v1-5) follow a 8-4-4-4-12 pattern.',
  },
];

export function detectHash(input: string): HashDefinition | null {
  const value = input.trim();
  for (const def of hashDefinitions) {
    if (def.regex.test(value)) {
      return def;
    }
  }
  return null;
}

export const hashes = hashDefinitions;
