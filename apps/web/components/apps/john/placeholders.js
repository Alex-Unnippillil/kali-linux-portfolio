export const johnPlaceholders = {
  banners: {
    desktop: 'Demo only – no real cracking performed.',
    page: 'Demo only – simulated cracking.',
  },
  sampleWordlists: [
    {
      label: 'Common Passwords',
      path: '/samples/common.txt',
      description:
        'Excerpt from the SecLists common credentials set trimmed for demo use.',
    },
    {
      label: 'Names',
      path: '/samples/names.txt',
      description: 'Given-name sample pulled from the SecLists names collection.',
    },
  ],
  hashedPasswords: [
    {
      hash: '5f4dcc3b5aa765d61d8327deb882cf99',
      plaintext: 'password',
      strength: 'weak',
      note: 'Classic MD5 hash used in demos and documentation.',
    },
    {
      hash: 'e10adc3949ba59abbe56e057f20f883e',
      plaintext: '123456',
      strength: 'weak',
      note: 'Represents a common numeric-only password for training.',
    },
  ],
  fallbackHash: 'ffffffffffffffffffffffffffffffff',
  defaultWordlist: ['password', '123456', 'letmein', 'admin', 'welcome'],
  auditUsers: [
    { username: 'alice', password: 'password123' },
    { username: 'bob', password: 'letmein' },
    { username: 'charlie', password: 'S3curePass!' },
    { username: 'dave', password: '123456' },
  ],
  weakPasswords: [
    'password',
    'password123',
    '123456',
    'qwerty',
    'letmein',
    'admin',
    'welcome',
  ],
  labResults: [
    {
      id: 'raw-md5-success',
      title: 'Raw-MD5 quick win',
      summary:
        'A single MD5 hash is cracked immediately with the SecLists sample list.',
      output:
        "Loaded 1 password hash (Raw-MD5 [MD5 128/128 AVX2 8x1])\nPress 'q' or Ctrl-C to abort, almost any other key for status\npassword (alice)\n1g 0:00:00:00 DONE (2024-01-01 00:00) 100.0g/s 0p/s 0c/s 0C/s\nUse the \"--show\" option to display all of the cracked passwords reliably\nSession completed.",
      interpretation: [
        'John identifies the hash format and hardware backend in the header line.',
        'Credential pairs print in the `password (username)` format upon cracking.',
        'Summary shows a trivial runtime because the keyspace is intentionally tiny.',
      ],
    },
    {
      id: 'wordlist-exhausted',
      title: 'Wordlist exhausted without match',
      summary:
        'Demonstrates how John reports an unsuccessful attempt when no candidates match.',
      output:
        "Loaded 1 password hash (Raw-SHA1 [SHA1 256/256 AVX2 8x])\nPress 'q' or Ctrl-C to abort, almost any other key for status\nSession completed.\n0 password hashes cracked, 1 left",
      interpretation: [
        'Header still confirms the format even when no crack occurs.',
        'Session footer calls out the number of hashes left, signalling the need for new tactics.',
      ],
    },
  ],
};

export default johnPlaceholders;
