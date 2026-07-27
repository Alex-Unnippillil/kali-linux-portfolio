const BIDI_CHAR_DETAILS: Record<string, string> = {
  '\u200E': 'Left-to-right mark',
  '\u200F': 'Right-to-left mark',
  '\u202A': 'Left-to-right embedding',
  '\u202B': 'Right-to-left embedding',
  '\u202C': 'Pop directional formatting',
  '\u202D': 'Left-to-right override',
  '\u202E': 'Right-to-left override',
  '\u2066': 'Left-to-right isolate',
  '\u2067': 'Right-to-left isolate',
  '\u2068': 'First strong isolate',
  '\u2069': 'Pop directional isolate',
};

const CONFUSABLE_REPLACEMENTS: Record<string, string> = {
  // Cyrillic lookalikes
  '\u0430': 'a',
  '\u0410': 'A',
  '\u0435': 'e',
  '\u0415': 'E',
  '\u043E': 'o',
  '\u041E': 'O',
  '\u0440': 'p',
  '\u0420': 'P',
  '\u0441': 'c',
  '\u0421': 'C',
  '\u0445': 'x',
  '\u0425': 'X',
  '\u0455': 's',
  '\u0456': 'i',
  '\u0406': 'I',
  '\u0457': 'i',
  '\u0407': 'I',
  '\u043A': 'k',
  '\u041A': 'K',
  '\u0443': 'y',
  '\u0423': 'Y',
  '\u0432': 'b',
  '\u0412': 'B',
  '\u043D': 'h',
  '\u041D': 'H',
  '\u043C': 'm',
  '\u041C': 'M',
  '\u0491': 'g',
  '\u0490': 'G',
  '\u0454': 'e',
  '\u0404': 'E',
  '\u043B': 'n',
  '\u041B': 'N',
  '\u0442': 't',
  '\u0422': 'T',
  '\u0438': 'u',
  '\u0418': 'U',
  '\u0448': 'w',
  '\u0428': 'W',
  '\u044C': 'b',
  '\u044A': 'b',
  '\u0433': 'r',
  '\u0413': 'R',
  '\u0444': 'f',
  '\u0424': 'F',
  '\u0436': 'zh',
  '\u0416': 'ZH',
  // Greek lookalikes
  '\u0391': 'A',
  '\u03B1': 'a',
  '\u0395': 'E',
  '\u03B5': 'e',
  '\u039F': 'O',
  '\u03BF': 'o',
  '\u03A1': 'P',
  '\u03C1': 'p',
  '\u03A7': 'X',
  '\u03C7': 'x',
  '\u03A4': 'T',
  '\u03C4': 't',
  '\u03A5': 'Y',
  '\u03C5': 'y',
  '\u039A': 'K',
  '\u03BA': 'k',
  '\u039C': 'M',
  '\u03BC': 'm',
  '\u039D': 'N',
  '\u03BD': 'v',
  '\u039B': 'L',
  '\u03BB': 'l',
  '\u0392': 'B',
  '\u03B2': 'b',
  '\u0397': 'H',
  '\u03B7': 'n',
  '\u0399': 'I',
  '\u03B9': 'i',
  '\u03A3': 'S',
  '\u03C3': 's',
  '\u03C2': 's',
  '\u03B4': 'd',
  '\u03B6': 'z',
  '\u03B8': 'th',
  '\u03C9': 'w',
  // Full-width Latin
  '\uFF21': 'A',
  '\uFF22': 'B',
  '\uFF23': 'C',
  '\uFF24': 'D',
  '\uFF25': 'E',
  '\uFF26': 'F',
  '\uFF27': 'G',
  '\uFF28': 'H',
  '\uFF29': 'I',
  '\uFF2A': 'J',
  '\uFF2B': 'K',
  '\uFF2C': 'L',
  '\uFF2D': 'M',
  '\uFF2E': 'N',
  '\uFF2F': 'O',
  '\uFF30': 'P',
  '\uFF31': 'Q',
  '\uFF32': 'R',
  '\uFF33': 'S',
  '\uFF34': 'T',
  '\uFF35': 'U',
  '\uFF36': 'V',
  '\uFF37': 'W',
  '\uFF38': 'X',
  '\uFF39': 'Y',
  '\uFF3A': 'Z',
  '\uFF41': 'a',
  '\uFF42': 'b',
  '\uFF43': 'c',
  '\uFF44': 'd',
  '\uFF45': 'e',
  '\uFF46': 'f',
  '\uFF47': 'g',
  '\uFF48': 'h',
  '\uFF49': 'i',
  '\uFF4A': 'j',
  '\uFF4B': 'k',
  '\uFF4C': 'l',
  '\uFF4D': 'm',
  '\uFF4E': 'n',
  '\uFF4F': 'o',
  '\uFF50': 'p',
  '\uFF51': 'q',
  '\uFF52': 'r',
  '\uFF53': 's',
  '\uFF54': 't',
  '\uFF55': 'u',
  '\uFF56': 'v',
  '\uFF57': 'w',
  '\uFF58': 'x',
  '\uFF59': 'y',
  '\uFF5A': 'z',
};

const BIDI_CHARS = new Set(Object.keys(BIDI_CHAR_DETAILS));
const CONFUSABLE_CHARS = new Map(Object.entries(CONFUSABLE_REPLACEMENTS));

const toCodePoint = (char: string): string => {
  const code = char.codePointAt(0);
  if (code === undefined) return '';
  return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
};

export type SanitizedIssueType = 'bidi' | 'confusable';

export interface SanitizedCharacterIssue {
  char: string;
  index: number;
  codePoint: string;
  type: SanitizedIssueType;
  replacement?: string;
  message: string;
}

export interface SanitizeTextResult {
  original: string;
  normalized: string;
  safe: string;
  issues: SanitizedCharacterIssue[];
  warnings: string[];
  hasBidi: boolean;
  hasConfusables: boolean;
}

const buildWarningMessage = (issue: SanitizedCharacterIssue): string => {
  if (issue.type === 'bidi') {
    const description = BIDI_CHAR_DETAILS[issue.char] || 'Bidirectional control';
    return `${description} (${issue.codePoint}) removed to preserve text direction.`;
  }
  if (issue.type === 'confusable' && issue.replacement) {
    return `Character "${issue.char}" (${issue.codePoint}) visually mimics "${issue.replacement}". It has been normalized.`;
  }
  return `Suspicious character "${issue.char}" (${issue.codePoint}) detected.`;
};

export const sanitizeText = (value: string): SanitizeTextResult => {
  const normalized = value.normalize('NFKC');
  const issues: SanitizedCharacterIssue[] = [];
  const safeChars: string[] = [];

  for (let i = 0, index = 0; i < normalized.length; i++) {
    const codePoint = normalized.codePointAt(i);
    if (codePoint === undefined) continue;
    const char = String.fromCodePoint(codePoint);

    // If char uses surrogate pair, advance index accordingly
    const charLength = char.length;
    const displayIndex = index;
    index += 1;
    if (charLength > 1) {
      i += charLength - 1;
    }

    if (BIDI_CHARS.has(char)) {
      const issue: SanitizedCharacterIssue = {
        char,
        index: displayIndex,
        codePoint: toCodePoint(char),
        type: 'bidi',
        message: '',
      };
      issue.message = buildWarningMessage(issue);
      issues.push(issue);
      continue;
    }

    const replacement = CONFUSABLE_CHARS.get(char);
    if (replacement) {
      const issue: SanitizedCharacterIssue = {
        char,
        index: displayIndex,
        codePoint: toCodePoint(char),
        type: 'confusable',
        replacement,
        message: '',
      };
      issue.message = buildWarningMessage(issue);
      issues.push(issue);
      safeChars.push(replacement);
      continue;
    }

    safeChars.push(char);
  }

  const warnings: string[] = [];
  for (const issue of issues) {
    if (!warnings.includes(issue.message)) warnings.push(issue.message);
  }

  return {
    original: value,
    normalized,
    safe: safeChars.join(''),
    issues,
    warnings,
    hasBidi: issues.some((issue) => issue.type === 'bidi'),
    hasConfusables: issues.some((issue) => issue.type === 'confusable'),
  };
};

export const stripDangerousText = (value: string): string => sanitizeText(value).safe;

export default sanitizeText;
