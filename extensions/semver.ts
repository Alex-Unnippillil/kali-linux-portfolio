export interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export type RangeIssue = 'range-invalid' | 'version-invalid' | 'mismatch';

export interface RangeCheck {
  ok: boolean;
  expected: string;
  actual: string;
  issue?: RangeIssue;
  detail?: string;
}

type ComparatorOperator = '>' | '>=' | '<' | '<=' | '=';

interface Comparator {
  operator: ComparatorOperator;
  version: Semver;
}

const PARTIAL_VERSION_REGEX =
  /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

const OR_SEPARATOR = /\s*\|\|\s*/;
const WHITESPACE_SEPARATOR = /\s+/;

const WILDCARD_TOKENS = new Set(['*', 'x', 'X']);

const NORMALIZED_WILDCARD = '*';

export const normalizeRange = (input: string): string => {
  const trimmed = input.trim();
  return trimmed === '' ? NORMALIZED_WILDCARD : trimmed;
};

export const parseVersion = (input: string): Semver | null => {
  const match = PARTIAL_VERSION_REGEX.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: match[2] === undefined ? 0 : Number(match[2]),
    patch: match[3] === undefined ? 0 : Number(match[3]),
    prerelease: match[4] || undefined,
  };
};

export const compareVersions = (a: Semver, b: Semver): number => {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease && b.prerelease) {
    if (a.prerelease === b.prerelease) return 0;
    return a.prerelease > b.prerelease ? 1 : -1;
  }
  return 0;
};

const bumpMajor = (version: Semver): Semver => ({
  major: version.major + 1,
  minor: 0,
  patch: 0,
});

const bumpMinor = (version: Semver): Semver => ({
  major: version.major,
  minor: version.minor + 1,
  patch: 0,
});

const bumpPatch = (version: Semver): Semver => ({
  major: version.major,
  minor: version.minor,
  patch: version.patch + 1,
});

const caretUpperBound = (version: Semver): Semver => {
  if (version.major > 0) return bumpMajor(version);
  if (version.minor > 0) return bumpMinor(version);
  return bumpPatch(version);
};

const parseComparatorToken = (token: string): Comparator[] | null => {
  if (token === '') return [];
  if (WILDCARD_TOKENS.has(token)) return [];

  if (token.startsWith('^')) {
    const base = parseVersion(token.slice(1));
    if (!base) return null;
    return [
      { operator: '>=', version: base },
      { operator: '<', version: caretUpperBound(base) },
    ];
  }

  if (token.startsWith('~')) {
    const base = parseVersion(token.slice(1));
    if (!base) return null;
    return [
      { operator: '>=', version: base },
      { operator: '<', version: bumpMinor(base) },
    ];
  }

  let operator: ComparatorOperator = '=';
  let versionText = token;
  const operatorMatch = token.match(/^(<=|>=|<|>|=)/);
  if (operatorMatch) {
    operator = operatorMatch[1] as ComparatorOperator;
    versionText = token.slice(operator.length);
  }

  const version = parseVersion(versionText);
  if (!version) return null;

  return [{ operator, version }];
};

const parseRange = (range: string): Comparator[][] | null => {
  const parts = range.split(OR_SEPARATOR);
  if (parts.length === 0) return null;
  const result: Comparator[][] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part === '') return null;
    const tokens = part.split(WHITESPACE_SEPARATOR).filter(Boolean);
    if (tokens.length === 0) return null;

    const comparators: Comparator[] = [];
    for (const token of tokens) {
      const parsed = parseComparatorToken(token);
      if (parsed === null) return null;
      comparators.push(...parsed);
    }

    result.push(comparators);
  }

  return result;
};

const satisfiesComparator = (version: Semver, comparator: Comparator): boolean => {
  const cmp = compareVersions(version, comparator.version);
  switch (comparator.operator) {
    case '>':
      return cmp > 0;
    case '>=':
      return cmp >= 0;
    case '<':
      return cmp < 0;
    case '<=':
      return cmp <= 0;
    case '=':
    default:
      return cmp === 0;
  }
};

export const checkSatisfiesRange = (
  rangeInput: string,
  versionInput: string
): RangeCheck => {
  const expected = normalizeRange(rangeInput);
  const actual = versionInput.trim();

  if (expected === NORMALIZED_WILDCARD) {
    return { ok: true, expected, actual };
  }

  const parsedVersion = parseVersion(actual);
  if (!parsedVersion) {
    return {
      ok: false,
      expected,
      actual,
      issue: 'version-invalid',
      detail: `"${actual}" is not a valid semantic version`,
    };
  }

  const comparatorSets = parseRange(expected);
  if (!comparatorSets) {
    return {
      ok: false,
      expected,
      actual,
      issue: 'range-invalid',
      detail: `"${expected}" is not a supported range`,
    };
  }

  for (const set of comparatorSets) {
    if (set.length === 0) {
      return { ok: true, expected, actual };
    }

    const satisfied = set.every((comparator) => satisfiesComparator(parsedVersion, comparator));
    if (satisfied) {
      return { ok: true, expected, actual };
    }
  }

  return {
    ok: false,
    expected,
    actual,
    issue: 'mismatch',
    detail: `${actual} does not satisfy ${expected}`,
  };
};

export const describeRangeResult = (
  result: RangeCheck,
  subject = 'core API'
): string => {
  if (result.ok) {
    return `${subject} requirement ${result.expected} is satisfied.`;
  }

  switch (result.issue) {
    case 'range-invalid':
      return `${subject} requirement "${result.expected}" is invalid${
        result.detail ? `: ${result.detail}.` : '.'
      }`;
    case 'version-invalid':
      return `Current ${subject} version "${result.actual}" is invalid${
        result.detail ? `: ${result.detail}.` : '.'
      }`;
    case 'mismatch':
    default:
      return `${subject} requirement "${result.expected}" is not satisfied by version ${result.actual}.`;
  }
};
