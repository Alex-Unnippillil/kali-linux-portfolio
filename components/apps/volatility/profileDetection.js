const MAX_BYTES = 8192;

const PROFILE_SIGNATURES = [
  {
    slug: 'Win10x64_19041',
    label: 'Windows 10 x64 (19041)',
    patterns: [
      /Build\s*:?\s*19041/i,
      /MajorVersion\s*:?\s*10/i,
      /(Machine|Architecture)\s*:?\s*(AMD64|x64)/i,
      /ntoskrnl\.exe/i,
    ],
    rationale:
      'Win10 20H1 captures often include build 19041 along with ntoskrnl and AMD64 architecture markers.',
  },
  {
    slug: 'Win7SP1x64',
    label: 'Windows 7 SP1 x64',
    patterns: [
      /Build\s*:?\s*7601/i,
      /MajorVersion\s*:?\s*6/i,
      /MinorVersion\s*:?\s*1/i,
      /(Machine|Architecture)\s*:?\s*(AMD64|x64)/i,
    ],
    rationale:
      'Windows 7 SP1 x64 dumps surface build 7601 and a 6.1 kernel version.',
  },
  {
    slug: 'Win7SP1x86',
    label: 'Windows 7 SP1 x86',
    patterns: [
      /Build\s*:?\s*7601/i,
      /MajorVersion\s*:?\s*6/i,
      /MinorVersion\s*:?\s*1/i,
      /(Machine|Architecture)\s*:?\s*(i386|x86)/i,
    ],
    rationale:
      'Windows 7 SP1 32-bit captures highlight build 7601 with an i386 machine flag.',
  },
  {
    slug: 'WinXPSP3x86',
    label: 'Windows XP SP3 x86',
    patterns: [
      /Build\s*:?\s*2600/i,
      /MajorVersion\s*:?\s*5/i,
      /MinorVersion\s*:?\s*1/i,
      /(Machine|Architecture)\s*:?\s*(i386|x86)/i,
    ],
    rationale:
      'Windows XP SP3 headers still reference build 2600 with a 5.1 kernel.',
  },
  {
    slug: 'LinuxUbuntu2004x64',
    label: 'Linux Ubuntu 20.04 x64',
    patterns: [
      /Linux version\s*5\.[4-8]/i,
      /(Ubuntu|Focal Fossa)/i,
      /(x86_64|amd64)/i,
    ],
    rationale:
      'Ubuntu 20.04 kernels identify as 5.4+ with Ubuntu or Focal strings and x86_64 architecture.',
  },
  {
    slug: 'LinuxDebianx86',
    label: 'Linux Debian x86',
    patterns: [
      /Linux version\s*3\./i,
      /Debian/i,
      /(i386|i686)/i,
    ],
    rationale:
      'Debian forensic memory captures from 32-bit kernels expose Debian branding and i386 hints.',
  },
  {
    slug: 'MacOS10_15',
    label: 'macOS Catalina 10.15',
    patterns: [
      /Darwin Kernel Version\s*19/i,
      /RELEASE_X86_64/i,
      /Mac OS X 10\.15/i,
    ],
    rationale:
      'macOS Catalina dumps typically embed Darwin Kernel Version 19 with RELEASE_X86_64 markers.',
  },
];

const FAMILY_HINTS = [
  {
    family: 'windows',
    patterns: [/windows/i, /ntoskrnl/i, /kdbgcontrolset/i],
    suggestions: ['Win10x64_19041', 'Win7SP1x64', 'Win7SP1x86', 'WinXPSP3x86'],
    note:
      'General Windows artefacts were observed but no exact profile matched. Try common Windows profiles.',
  },
  {
    family: 'linux',
    patterns: [/linux/i, /ELF/i, /gnu/i],
    suggestions: ['LinuxUbuntu2004x64', 'LinuxDebianx86'],
    note:
      'Linux kernel artefacts detected. Provide the kernel version closest to your capture.',
  },
  {
    family: 'macos',
    patterns: [/darwin/i, /mac os/i],
    suggestions: ['MacOS10_15'],
    note:
      'Darwin headers found without a clear version signature. Consider popular macOS profiles.',
  },
];

const toUniqueBySlug = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
};

const normalizeScore = (score) => Number(score.toFixed(2));

const confidenceLevel = (score) => {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score > 0) return 'low';
  return 'none';
};

const toBytes = (input) => {
  if (!input) {
    throw new Error('Sample is empty.');
  }
  if (typeof input === 'string') {
    return new TextEncoder().encode(input);
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  throw new Error('Unsupported sample type.');
};

const decodeHeader = (bytes) => {
  const limited = bytes.subarray(0, Math.min(bytes.length, MAX_BYTES));
  let text = '';
  if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    text = decoder.decode(limited);
  } else {
    text = Array.from(limited)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : ' '))
      .join('');
  }
  return text.replace(/\u0000/g, ' ').trim();
};

export const inspectHeader = (input) => {
  const bytes = toBytes(input);
  const headerText = decodeHeader(bytes);

  const matches = PROFILE_SIGNATURES.map((signature) => {
    const matchCount = signature.patterns.reduce(
      (count, pattern) => count + (pattern.test(headerText) ? 1 : 0),
      0
    );
    const score = matchCount / signature.patterns.length;
    return {
      slug: signature.slug,
      label: signature.label,
      matchCount,
      total: signature.patterns.length,
      score,
      rationale: signature.rationale,
    };
  }).filter((entry) => entry.matchCount > 1);

  matches.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);

  const bestMatch = matches[0] ?? null;
  const baseScore = bestMatch ? normalizeScore(bestMatch.score) : 0;
  const level = confidenceLevel(baseScore);

  const ambiguousMatches = bestMatch
    ? matches
        .filter((entry) => entry.slug !== bestMatch.slug && entry.score >= bestMatch.score - 0.15)
        .map((entry) => ({
          slug: entry.slug,
          label: entry.label,
          confidence: normalizeScore(entry.score),
          rationale: entry.rationale,
        }))
    : [];

  const familyHint = FAMILY_HINTS.find((family) =>
    family.patterns.some((pattern) => pattern.test(headerText))
  );

  let suggestions = ambiguousMatches;
  let note = '';

  if (bestMatch) {
    note = bestMatch.rationale;
    if (level === 'low') {
      note += ' Confidence is low; verify with another plugin output.';
    }
  }

  if (familyHint) {
    if (!bestMatch) {
      note = familyHint.note;
    }
    if (!bestMatch || level !== 'high') {
      const familySuggestions = PROFILE_SIGNATURES.filter((signature) =>
        familyHint.suggestions.includes(signature.slug)
      ).map((signature) => ({
        slug: signature.slug,
        label: signature.label,
        confidence: 0.3,
        rationale: signature.rationale,
      }));
      suggestions = suggestions.concat(familySuggestions);
    }
  }

  if (!bestMatch && !familyHint) {
    note =
      'No recognizable header markers were detected. You may need to select a profile manually based on the acquisition source.';
  }

  suggestions = toUniqueBySlug(suggestions);

  return {
    headerText,
    profile: bestMatch
      ? {
          slug: bestMatch.slug,
          label: bestMatch.label,
        }
      : null,
    confidence: {
      level,
      score: normalizeScore(baseScore),
    },
    suggestions,
    note,
    family: familyHint ? familyHint.family : null,
  };
};

export default inspectHeader;
