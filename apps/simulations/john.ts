export interface JohnSimulationOptions {
  hash: string;
  rules?: string;
}

export interface JohnSimulationResult {
  output: string;
  cracked: boolean;
  password?: string;
  hashType: string;
}

export interface JohnStoryboardStep {
  title: string;
  example: string;
  description: string;
  takeaway: string;
}

const demoPotfile: Array<{ hash: string; password: string; hashType: string }> = [
  {
    hash: '5f4dcc3b5aa765d61d8327deb882cf99',
    password: 'password',
    hashType: 'Raw-MD5',
  },
  {
    hash: '$6$demo$L6A7nZC6LzKWu6HRfbBtvWNzoZeU7bawUCgTnMjfsorCej2bcqLC1/xwrzd0oPEfyYZl13SQ1SeDsICoZ6cFy0',
    password: 'winter2024!',
    hashType: 'sha512crypt',
  },
  {
    hash: '$2y$05$abcdefghijklmnopqrstuvuvu0/MTTn6P0ZVqW8W9kM7.',
    password: 'demo1234',
    hashType: 'bcrypt',
  },
];

const detectHashType = (hash: string) => {
  if (hash.startsWith('$6$')) return 'sha512crypt';
  if (hash.startsWith('$2') || hash.startsWith('$2y$')) return 'bcrypt';
  if (/^[a-f0-9]{32}$/i.test(hash)) return 'Raw-MD5';
  if (/^[a-f0-9]{40}$/i.test(hash)) return 'Raw-SHA1';
  return 'Unknown';
};

export const runJohnSimulation = async (
  options: JohnSimulationOptions
): Promise<JohnSimulationResult> => {
  const trimmed = options.hash.trim();
  const match = demoPotfile.find((entry) => entry.hash === trimmed);
  const hashType = match?.hashType || detectHashType(trimmed);

  if (match) {
    return {
      output: `Simulated crack successful!\nHash: ${trimmed}\nPassword: ${match.password}\nHash type: ${hashType}\nRules applied: ${options.rules || 'default demo rules'}`,
      cracked: true,
      password: match.password,
      hashType,
    };
  }

  return {
    output: `No match found in the demo potfile for hash ${trimmed}.\nHash type guess: ${hashType}.\nExplain to learners how you would extend the wordlist or tune rules to continue the exercise.`,
    cracked: false,
    hashType,
  };
};

export const johnStoryboard: JohnStoryboardStep[] = [
  {
    title: 'Briefing',
    example: 'Share a hashed password captured from a lab system and confirm permission to attempt cracking.',
    description:
      'Set expectations with stakeholders about why password cracking is part of the assessment and how results will be handled.',
    takeaway: 'Always store hashes securely and destroy them after the engagement.',
  },
  {
    title: 'Wordlist selection',
    example: 'Discuss the difference between rockyou.txt and a custom employee-season list.',
    description:
      'Highlight why curated wordlists are more effective than blindly running every rule.',
    takeaway: 'Quality of inputs beats quantity; tailor wordlists to the organisation.',
  },
  {
    title: 'Result handling',
    example: 'Demonstrate how to document cracked credentials and notify the blue team.',
    description:
      'The canned simulation focuses on communication, not exploitation.',
    takeaway: 'Reset compromised accounts and enable MFA where possible.',
  },
];

export default {
  runJohnSimulation,
  johnStoryboard,
};
