import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/router';
import TerminalOutput from '../TerminalOutput';
import FormError from '../ui/FormError';

type FlagType = 'short' | 'long';

export interface CommandFlag {
  type: FlagType;
  name: string;
  value: string | boolean;
}

export interface CommandAst {
  raw: string;
  command: string;
  args: string[];
  flags: CommandFlag[];
  errors: string[];
}

export const CommandAstSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://unnippillil.com/schemas/command-builder.json',
  title: 'CommandBuilderAST',
  type: 'object',
  additionalProperties: false,
  properties: {
    raw: { type: 'string' },
    command: { type: 'string' },
    args: {
      type: 'array',
      items: { type: 'string' },
    },
    flags: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { enum: ['short', 'long'] },
          name: { type: 'string' },
          value: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
        },
        required: ['type', 'name', 'value'],
      },
    },
    errors: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['raw', 'command', 'args', 'flags', 'errors'],
} as const;

interface TokenizeResult {
  tokens: string[];
  errors: string[];
}

const WHITESPACE = /\s/;

const tokenize = (input: string): TokenizeResult => {
  const tokens: string[] = [];
  const errors: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingle) {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && WHITESPACE.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaped) {
    errors.push('Trailing escape character.');
  }
  if (inSingle) {
    errors.push('Unclosed single quote.');
  }
  if (inDouble) {
    errors.push('Unclosed double quote.');
  }
  if (current) {
    tokens.push(current);
  }

  return { tokens, errors };
};

const formatFlag = (flag: { type: FlagType; name: string }) =>
  `${flag.type === 'long' ? '--' : '-'}${flag.name}`;

const tokenLooksLikeFlag = (token: string) =>
  token.startsWith('-') && token.length > 1;

const parseFlagsAndArgs = (tokens: string[], errors: string[]) => {
  const args: string[] = [];
  const flags: CommandFlag[] = [];
  let pendingFlag: (CommandFlag & { pending: true }) | null = null;

  const flushPending = () => {
    if (pendingFlag) {
      errors.push(`Flag "${formatFlag(pendingFlag)}" expects a value.`);
      flags.push({ type: pendingFlag.type, name: pendingFlag.name, value: true });
      pendingFlag = null;
    }
  };

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (pendingFlag) {
      if (!tokenLooksLikeFlag(token) || token === '--') {
        flags.push({
          type: pendingFlag.type,
          name: pendingFlag.name,
          value: token,
        });
        pendingFlag = null;
        continue;
      }

      flags.push({ type: pendingFlag.type, name: pendingFlag.name, value: true });
      pendingFlag = null;
      // fall through to treat the current token as a new flag
    }

    if (token === '--') {
      args.push(...tokens.slice(index + 1));
      break;
    }

    if (tokenLooksLikeFlag(token) && token.startsWith('--')) {
      const longBody = token.slice(2);
      const eqIndex = longBody.indexOf('=');
      if (eqIndex !== -1) {
        const name = longBody.slice(0, eqIndex);
        const value = longBody.slice(eqIndex + 1);
        flags.push({ type: 'long', name, value });
      } else {
        pendingFlag = { type: 'long', name: longBody, value: true, pending: true };
      }
      continue;
    }

    if (tokenLooksLikeFlag(token) && !token.startsWith('--')) {
      const shortBody = token.slice(1);
      const eqIndex = shortBody.indexOf('=');
      if (eqIndex !== -1) {
        const name = shortBody.slice(0, eqIndex) || shortBody[0];
        const value = shortBody.slice(eqIndex + 1);
        flags.push({ type: 'short', name, value });
        continue;
      }

      if (shortBody.length > 1) {
        const chars = shortBody.split('');
        const nextToken = tokens[index + 1];
        const lastIndex = chars.length - 1;
        chars.forEach((char, charIndex) => {
          if (charIndex === lastIndex && nextToken && !tokenLooksLikeFlag(nextToken)) {
            pendingFlag = { type: 'short', name: char, value: true, pending: true };
          } else {
            flags.push({ type: 'short', name: char, value: true });
          }
        });
      } else {
        pendingFlag = { type: 'short', name: shortBody, value: true, pending: true };
      }
      continue;
    }

    args.push(token);
  }

  flushPending();

  return { args, flags };
};

export const parseCommand = (input: string): CommandAst => {
  const trimmed = input.trim();
  const { tokens, errors: tokenErrors } = tokenize(trimmed);
  const errors = [...tokenErrors];

  const command = tokens[0] ?? '';
  if (!command && trimmed.length > 0) {
    errors.push('Command is required.');
  }

  const { args, flags } = parseFlagsAndArgs(tokens, errors);

  return {
    raw: input,
    command,
    args,
    flags,
    errors,
  };
};

const SAFE_TOKEN = /^[A-Za-z0-9@%_\-+=:,./]+$/;

const shellEscape = (token: string) => {
  if (token === '') {
    return "''";
  }
  if (SAFE_TOKEN.test(token)) {
    return token;
  }
  return `'${token.replace(/'/g, "'\\''")}'`;
};

export const stringifyCommand = (ast: CommandAst): string => {
  if (!ast.command) {
    return '';
  }

  const tokens: string[] = [ast.command];

  ast.flags.forEach((flag) => {
    if (flag.type === 'long') {
      tokens.push(`--${flag.name}`);
    } else {
      tokens.push(`-${flag.name}`);
    }
    if (flag.value !== true) {
      tokens.push(String(flag.value));
    }
  });

  ast.args.forEach((arg) => {
    tokens.push(arg);
  });

  return tokens.map(shellEscape).join(' ');
};

export const buildShareLink = (currentPath: string, command: string) => {
  const [pathWithoutHash] = currentPath.split('#');
  const [basePath] = (pathWithoutHash ?? '/').split('?');
  const encoded = encodeURIComponent(command);
  return `${basePath || '/'}?cmd=${encoded}`;
};

export const decodeSharedCommand = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return null;
  }
};

interface BuilderProps {
  doc: string;
  initialCommand?: string;
  build?: (params: Record<string, string>) => string;
}

const CommandBuilder = ({ doc, initialCommand, build }: BuilderProps) => {
  const router = useRouter();
  const defaultCommandRef = useRef<string>(
    initialCommand ?? (build ? build({}) : '') ?? ''
  );
  const [commandText, setCommandText] = useState(defaultCommandRef.current);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);

  const ast = useMemo(() => parseCommand(commandText), [commandText]);
  const hasValidCommand = ast.command !== '' && ast.errors.length === 0;
  const normalizedCommand = hasValidCommand ? stringifyCommand(ast) : '';

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const queryValue = router.query.cmd;
    if (!queryValue) {
      setShareError(null);
      return;
    }
    const shareValue = Array.isArray(queryValue) ? queryValue[0] : queryValue;
    if (typeof shareValue !== 'string') {
      return;
    }
    const decoded = decodeSharedCommand(shareValue);
    if (decoded === null) {
      setShareError('Unable to decode shared command.');
      return;
    }
    setShareError(null);
    setCommandText(decoded);
  }, [router.isReady, router.query.cmd]);

  useEffect(() => {
    if (copyState === 'idle') {
      return undefined;
    }
    const timeout = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timeout);
  }, [copyState]);

  const onCopy = useCallback(async () => {
    if (!normalizedCommand) {
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedCommand);
        setCopyState('copied');
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (error) {
      setCopyState('error');
    }
  }, [normalizedCommand]);

  const shareHref = normalizedCommand
    ? buildShareLink(router.asPath || router.pathname, normalizedCommand)
    : '';

  const onShare = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (!normalizedCommand) {
        event.preventDefault();
        return;
      }
      const href = buildShareLink(
        router.asPath || router.pathname,
        normalizedCommand
      );
      event.preventDefault();
      router.replace(href, undefined, { shallow: true });
    },
    [normalizedCommand, router]
  );

  const mergedErrors = [...(shareError ? [shareError] : []), ...ast.errors];

  return (
    <form
      className="text-xs"
      onSubmit={(event) => event.preventDefault()}
      aria-label="command builder"
    >
      <p className="mb-2" aria-label="inline docs">
        {doc}
      </p>
      <label className="block mb-2" htmlFor="command-builder-input">
        <span className="mr-1 font-semibold">Command</span>
        <textarea
          id="command-builder-input"
          aria-label="command input"
          value={commandText}
          onChange={(event) => setCommandText(event.target.value)}
          rows={3}
          className="border p-1 text-black w-full"
          placeholder="Enter a command to parse"
        />
      </label>
      {mergedErrors.length > 0 && (
        <FormError className="mt-0">{mergedErrors.join(' ')}</FormError>
      )}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onCopy}
          disabled={!normalizedCommand}
          className="px-2 py-1 bg-ub-green text-black disabled:opacity-50"
        >
          Copy
        </button>
        <a
          href={shareHref || '#'}
          onClick={onShare}
          aria-disabled={!normalizedCommand}
          className={`px-2 py-1 bg-ub-blue text-black ${
            normalizedCommand ? '' : 'opacity-50 pointer-events-none'
          }`}
        >
          Share
        </a>
        {copyState === 'copied' && (
          <span className="text-ub-green" aria-live="polite">
            Copied!
          </span>
        )}
        {copyState === 'error' && (
          <span className="text-red-500" aria-live="polite">
            Copy failed
          </span>
        )}
      </div>
      <div className="mb-2">
        <h3 className="font-semibold mb-1">AST</h3>
        <pre className="bg-black p-2 overflow-auto" aria-label="command ast">
{JSON.stringify(
            {
              command: ast.command,
              args: ast.args,
              flags: ast.flags,
            },
            null,
            2
          )}
        </pre>
      </div>
      <div className="mt-2">
        <TerminalOutput
          text={normalizedCommand || commandText.trim()}
          ariaLabel="command output"
        />
      </div>
    </form>
  );
};

export default CommandBuilder;
