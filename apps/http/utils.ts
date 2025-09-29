export interface HeaderEntry {
  key: string;
  value: string;
}

export interface RequestState {
  method: string;
  url: string;
  headers: HeaderEntry[];
  body: string;
}

const HTTP_VERSION = 'HTTP/1.1';

const CONTROL_CHARS_REGEX = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/;

const escapeSingleQuotes = (value: string): string => {
  return `'${value.replace(/'/g, "'\\''")}'`;
};

const escapeForCStyle = (value: string): string => {
  let result = '';
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const code = value.charCodeAt(i);

    switch (char) {
      case '\\':
        result += '\\\\';
        break;
      case "'":
        result += "\\'";
        break;
      case '\n':
        result += '\\n';
        break;
      case '\r':
        result += '\\r';
        break;
      case '\t':
        result += '\\t';
        break;
      case '\b':
        result += '\\b';
        break;
      case '\f':
        result += '\\f';
        break;
      case '\v':
        result += '\\v';
        break;
      default:
        if (code < 32 || code === 127) {
          result += `\\x${code.toString(16).padStart(2, '0')}`;
        } else {
          result += char;
        }
    }
  }

  return `$'${result}'`;
};

const isBinaryBody = (body: string): boolean => {
  return CONTROL_CHARS_REGEX.test(body);
};

const normalizeHeaders = (headers: HeaderEntry[]): HeaderEntry[] => {
  return headers
    .map((header) => ({
      key: header.key.trim(),
      value: header.value.trim(),
    }))
    .filter((header) => header.key.length > 0);
};

const getHostFromHeaders = (headers: HeaderEntry[]): string | undefined => {
  const hostHeader = headers.find((header) => header.key.toLowerCase() === 'host');
  return hostHeader?.value;
};

const getPathFromUrl = (url: string): { host?: string; path: string } => {
  if (!url) {
    return { path: '/' };
  }

  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname || '/'}${parsed.search}` || '/';
    return { host: parsed.host, path: path || '/' };
  } catch (error) {
    if (url.startsWith('/')) {
      return { path: url };
    }
    return { path: '/', host: undefined };
  }
};

export const buildCurlCommand = ({ method, url, headers, body }: RequestState): string => {
  const sanitizedHeaders = normalizeHeaders(headers);
  const parts: string[] = ['curl'];

  if (method) {
    parts.push('-X', escapeSingleQuotes(method));
  }

  if (url) {
    parts.push('--url', escapeSingleQuotes(url));
  }

  sanitizedHeaders.forEach((header) => {
    parts.push('-H', escapeSingleQuotes(`${header.key}: ${header.value}`));
  });

  if (body.length > 0) {
    if (isBinaryBody(body)) {
      parts.push('--data-binary', escapeForCStyle(body));
    } else {
      parts.push('--data-raw', escapeSingleQuotes(body));
    }
  }

  return parts.join(' ');
};

export const buildRawRequest = ({ method, url, headers, body }: RequestState): string => {
  const sanitizedHeaders = normalizeHeaders(headers);
  const { host: urlHost, path } = getPathFromUrl(url);
  const lines: string[] = [`${method || 'GET'} ${path} ${HTTP_VERSION}`];

  const hostHeader = getHostFromHeaders(sanitizedHeaders);
  if (urlHost && !hostHeader) {
    lines.push(`Host: ${urlHost}`);
  }

  sanitizedHeaders.forEach((header) => {
    lines.push(`${header.key}: ${header.value}`);
  });

  if (body.length > 0) {
    lines.push('', body);
  }

  return lines.join('\n');
};

export { normalizeHeaders, isBinaryBody };
