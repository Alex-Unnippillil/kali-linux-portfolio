export const REDACTION_TEXT = '[redacted]';

const UNIX_HOME_PATH_REGEX = /(\/)(Users|home|var\/www|opt)\/([^\s\/]+)(?=\/?)/gi;
const WINDOWS_DRIVE_HOME_REGEX = /([A-Za-z]:\\Users\\)([A-Za-z0-9_.-]+)/gi;
const WINDOWS_SERVER_HOME_REGEX = /(\\\\[^\\]+\\Users\\)([A-Za-z0-9_.-]+)/gi;
const WINDOWS_USERS_HOME_REGEX = /(\\\\Users\\)([A-Za-z0-9_.-]+)/gi;
const FILE_URI_REGEX = /(file:\/\/)([^\s]+?)(?=\s|$)/gi;

const SECRET_KEYS = [
  'token',
  'secret',
  'password',
  'passphrase',
  'apiKey',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'session',
  'bearer',
  'supabase',
  'service_role',
  'client_secret',
  'access_key',
  'secret_key',
];

const KEY_VALUE_PATTERN = new RegExp(
  `\\b(${SECRET_KEYS.join('|')})\\s*([:=])\\s*(['\"]?)([^'\"\s;&]+)\\3`,
  'gi',
);
const JSON_SECRET_PATTERN = new RegExp(
  `"(${SECRET_KEYS.join('|')})"\\s*:\\s*"([^"]*)"`,
  'gi',
);
const QUERY_SECRET_PATTERN = new RegExp(
  `([?&])(${SECRET_KEYS.join('|')})=([^&\s#]+)`,
  'gi',
);
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._\-+/=]+/gi;

const scrubPath = (text: string): string => text
  .replace(UNIX_HOME_PATH_REGEX, (_match, prefix, base) => `${prefix}${base}/${REDACTION_TEXT}`)
  .replace(WINDOWS_DRIVE_HOME_REGEX, (_match, prefix) => `${prefix}${REDACTION_TEXT}`)
  .replace(WINDOWS_SERVER_HOME_REGEX, (_match, prefix) => `${prefix}${REDACTION_TEXT}`)
  .replace(WINDOWS_USERS_HOME_REGEX, (_match, prefix) => `${prefix}${REDACTION_TEXT}`);

const scrubFileUri = (text: string): string => text.replace(
  FILE_URI_REGEX,
  (_match, prefix) => `${prefix}${REDACTION_TEXT}`,
);

const scrubSecrets = (text: string): string => text
  .replace(KEY_VALUE_PATTERN, (_match, key, separator, quote) => `${key}${separator}${quote}${REDACTION_TEXT}${quote}`)
  .replace(JSON_SECRET_PATTERN, (_match, key) => `"${key}":"${REDACTION_TEXT}"`)
  .replace(QUERY_SECRET_PATTERN, (_match, prefix, key) => `${prefix}${key}=${REDACTION_TEXT}`)
  .replace(BEARER_PATTERN, () => `Bearer ${REDACTION_TEXT}`);

const scrubEnvironmentVariables = (text: string): string => text.replace(
  /(export\s+)?([A-Z0-9_]{3,})=([^\s]+)/g,
  (match, prefix, key, value) => {
    const lowered = key.toLowerCase();
    const isSensitive = SECRET_KEYS.some((candidate) => lowered.includes(candidate));
    const looksSensitive = value.length > 16 && /^[A-Za-z0-9+/=_-]+$/.test(value);
    if (isSensitive || looksSensitive) {
      return `${prefix || ''}${key}=${REDACTION_TEXT}`;
    }
    return match;
  },
);

export const scrubSensitiveText = (input: string): string => {
  if (!input) return input;
  let sanitised = input;
  sanitised = scrubPath(sanitised);
  sanitised = scrubFileUri(sanitised);
  sanitised = scrubSecrets(sanitised);
  sanitised = scrubEnvironmentVariables(sanitised);
  return sanitised;
};

type AnyRecord = Record<string, unknown>;

type Visited = WeakSet<object>;

const scrubValue = (value: unknown, visited: Visited): unknown => {
  if (typeof value === 'string') {
    return scrubSensitiveText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, visited));
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }
  if (value && typeof value === 'object') {
    if (visited.has(value)) {
      return '[circular]';
    }
    visited.add(value);
    const entries = Object.entries(value as AnyRecord);
    const result: AnyRecord = {};
    entries.forEach(([key, inner]) => {
      result[key] = scrubValue(inner, visited);
    });
    visited.delete(value);
    return result;
  }
  return value;
};

export const scrubSensitiveData = <T>(payload: T): T => {
  if (payload == null) return payload;
  const visited: Visited = new WeakSet();
  return scrubValue(payload, visited) as T;
};

export default scrubSensitiveData;
