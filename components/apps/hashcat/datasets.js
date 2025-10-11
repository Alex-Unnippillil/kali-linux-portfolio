const hashDatasets = [
  {
    id: 'demo-md5',
    label: 'Common Passwords (MD5)',
    hashType: '0',
    summary: 'MD5 hashes generated from well-known weak passwords.',
    origin:
      'Hashes generated locally from the top of the RockYou wordlist (public breach list).',
    analysis:
      'Used to demonstrate how dictionary attacks expose legacy, unsalted hashes.',
    demoWordlist: 'rockyou-demo.txt',
    entries: [
      {
        id: 'md5-password',
        hash: '5f4dcc3b5aa765d61d8327deb882cf99',
        plaintext: 'password',
        classification: 'Default credential',
        remediation: 'Require unique passphrases and MFA.',
      },
      {
        id: 'md5-letmein',
        hash: '0d107d09f5bbe40cade3de5c71e9e9b7',
        plaintext: 'letmein',
        classification: 'Common reused password',
        remediation: 'Block breached passwords with password filters.',
      },
      {
        id: 'md5-summer2020',
        hash: '4ae8eadfabac84023fce47e980971a97',
        plaintext: 'summer2020',
        classification: 'Seasonal password pattern',
        remediation: 'Educate about unpredictable passphrases.',
      },
    ],
  },
  {
    id: 'demo-sha1',
    label: 'Common Passwords (SHA1)',
    hashType: '100',
    summary: 'SHA-1 hashes from the same weak password set.',
    origin: 'Hashes generated locally with Node.js crypto utilities.',
    analysis: 'Highlights that upgrading hash functions without salting is insufficient.',
    demoWordlist: 'weak-passwords.txt',
    entries: [
      {
        id: 'sha1-password',
        hash: '5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8',
        plaintext: 'password',
        classification: 'Default credential',
        remediation: 'Require unique passphrases and MFA.',
      },
      {
        id: 'sha1-letmein',
        hash: 'b7a875fc1ea228b9061041b7cec4bd3c52ab3ce3',
        plaintext: 'letmein',
        classification: 'Common reused password',
        remediation: 'Block breached passwords with password filters.',
      },
      {
        id: 'sha1-summer2020',
        hash: '89c6b5c0f1f0eb8db8b274a9297a3d440ce0d8c7',
        plaintext: 'summer2020',
        classification: 'Seasonal password pattern',
        remediation: 'Educate about unpredictable passphrases.',
      },
    ],
  },
  {
    id: 'demo-sha256',
    label: 'Common Passwords (SHA256)',
    hashType: '1400',
    summary: 'SHA-256 hashes for contrast with faster algorithms.',
    origin: 'Hashes generated locally with Node.js crypto utilities.',
    analysis: 'Shows that strong algorithms still fail without salting or complexity.',
    demoWordlist: 'top-passwords.txt',
    entries: [
      {
        id: 'sha256-password',
        hash:
          '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        plaintext: 'password',
        classification: 'Default credential',
        remediation: 'Require unique passphrases and MFA.',
      },
      {
        id: 'sha256-letmein',
        hash:
          '1c8bfe8f801d79745c4631d09fff36c82aa37fc4cce4fc946683d7b336b63032',
        plaintext: 'letmein',
        classification: 'Common reused password',
        remediation: 'Block breached passwords with password filters.',
      },
      {
        id: 'sha256-summer2020',
        hash:
          'c03fef0aa7b397bd683dd3253dc72dade92020388911dd579c5f599845e75d1f',
        plaintext: 'summer2020',
        classification: 'Seasonal password pattern',
        remediation: 'Educate about unpredictable passphrases.',
      },
    ],
  },
];

export default hashDatasets;

