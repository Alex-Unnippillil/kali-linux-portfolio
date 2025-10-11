export const userFixtures = [
  {
    name: 'lab-ssh-users.txt',
    label: 'SSH lab accounts',
    description:
      'Synthetic operator and admin accounts that appear in defensive training environments.',
    content: ['root', 'admin', 'devops', 'student', 'operator'].join('\n'),
    readOnly: true,
  },
  {
    name: 'lab-ftp-users.txt',
    label: 'FTP lab accounts',
    description:
      'Demo FTP users showing mixed privilege levels for credential stuffing practice.',
    content: ['ftp', 'anonymous', 'backup', 'qa', 'uploader'].join('\n'),
    readOnly: true,
  },
];

export const passwordFixtures = [
  {
    name: 'lab-common-passwords.txt',
    label: 'Common password spray list',
    description:
      'Short list of the most reused credentials seen in tabletop exercises. Safe for demos only.',
    content: [
      'Password123',
      'Summer2024!',
      'Welcome1',
      'admin123',
      'changeme',
      'letmein',
    ].join('\n'),
    readOnly: true,
  },
  {
    name: 'lab-rotations.txt',
    label: 'Seasonal rotation list',
    description:
      'Illustrates how seasonal rotations and exclamation suffixes make for predictable patterns.',
    content: [
      'Spring2024!',
      'Spring2024!!',
      'Summer2024!',
      'Fall2024!',
      'Winter2024!',
    ].join('\n'),
    readOnly: true,
  },
];

export const LAB_NOTICE =
  'For lab use only. Hydra commands are composed for education and never touch live systems.';
