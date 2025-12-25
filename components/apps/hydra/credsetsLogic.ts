import { detectSensitiveContent, patternDescriptions } from '../../../utils/redaction';

export interface CredentialDraft {
  label: string;
  alias: string;
  secret: string;
  notes: string;
  tags: string;
}

export interface CredentialSet {
  id: string;
  label: string;
  usernameAlias: string;
  passwordSummary: string;
  notes: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ValidationError {
  field: keyof CredentialDraft;
  message: string;
  code: string;
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: string[];
}

export const defaultDraft: CredentialDraft = {
  label: '',
  alias: '',
  secret: '',
  notes: '',
  tags: '',
};

const aliasWarningPatterns = new Set([
  'email-address',
  'ipv4-address',
]);

const blockingPatterns = new Set([
  'private-key-block',
  'password-assignment',
  'api-token',
  'aws-secret-key',
  'ssh-inline-secret',
  'credit-card',
]);

const ALIAS_MAX_LENGTH = 120;
const LABEL_MAX_LENGTH = 80;
const SUMMARY_MAX_LENGTH = 200;
const NOTES_MAX_LENGTH = 1000;

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cred-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

export const normalizeTags = (input: string): string[] =>
  input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

const sanitizeMultiline = (value: string, max = NOTES_MAX_LENGTH): string =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

export const toCredentialSet = (
  draft: CredentialDraft,
  base?: CredentialSet,
): CredentialSet => {
  const now = Date.now();
  return {
    id: base?.id ?? createId(),
    label: draft.label.trim().slice(0, LABEL_MAX_LENGTH),
    usernameAlias: draft.alias.trim().slice(0, ALIAS_MAX_LENGTH),
    passwordSummary: draft.secret.trim().slice(0, SUMMARY_MAX_LENGTH),
    notes: sanitizeMultiline(draft.notes, NOTES_MAX_LENGTH),
    tags: normalizeTags(draft.tags),
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };
};

const describeMatches = (matches: string[]): string[] =>
  matches
    .map((match) => patternDescriptions[match])
    .filter(Boolean);

export const validateCredentialDraft = (draft: CredentialDraft): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  if (!draft.label.trim()) {
    errors.push({ field: 'label', code: 'required', message: 'Label is required.' });
  } else if (draft.label.trim().length > LABEL_MAX_LENGTH) {
    errors.push({
      field: 'label',
      code: 'length',
      message: `Keep labels under ${LABEL_MAX_LENGTH} characters.`,
    });
  }

  if (!draft.alias.trim()) {
    errors.push({ field: 'alias', code: 'required', message: 'Provide an anonymized alias.' });
  } else if (draft.alias.length > ALIAS_MAX_LENGTH) {
    errors.push({
      field: 'alias',
      code: 'length',
      message: `Alias should stay under ${ALIAS_MAX_LENGTH} characters.`,
    });
  }

  if (!draft.secret.trim()) {
    errors.push({
      field: 'secret',
      code: 'required',
      message: 'Summarize the authentication posture without the real password.',
    });
  } else if (draft.secret.length > SUMMARY_MAX_LENGTH) {
    errors.push({
      field: 'secret',
      code: 'length',
      message: `Keep summaries under ${SUMMARY_MAX_LENGTH} characters.`,
    });
  }

  if (draft.notes.length > NOTES_MAX_LENGTH) {
    errors.push({
      field: 'notes',
      code: 'length',
      message: `Notes are capped at ${NOTES_MAX_LENGTH} characters to avoid data dumps.`,
    });
  }

  const aliasMatches = detectSensitiveContent(draft.alias);
  const summaryMatches = detectSensitiveContent(draft.secret);
  const noteMatches = detectSensitiveContent(draft.notes);

  for (const match of aliasMatches) {
    const description = patternDescriptions[match];
    if (blockingPatterns.has(match)) {
      errors.push({
        field: 'alias',
        code: 'sensitive',
        message: description || 'Sensitive data detected in alias.',
      });
    } else if (aliasWarningPatterns.has(match)) {
      warnings.push(description || 'Alias should avoid personal identifiers.');
    }
  }

  for (const match of summaryMatches) {
    const description = patternDescriptions[match];
    if (blockingPatterns.has(match) || match === 'aws-access-key') {
      errors.push({
        field: 'secret',
        code: 'sensitive',
        message: description || 'Sensitive data detected in summary.',
      });
    } else {
      warnings.push(description || 'Review the summary for anonymization.');
    }
  }

  warnings.push(...describeMatches(noteMatches));

  return {
    errors,
    warnings: Array.from(new Set(warnings.filter(Boolean))).slice(0, 6),
  };
};
