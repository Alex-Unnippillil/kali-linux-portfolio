'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { z, type ZodIssue } from 'zod';

type DirectiveType =
  | 'general-source'
  | 'script-source'
  | 'style-source'
  | 'ancestor-source'
  | 'no-value'
  | 'report-uri'
  | 'report-to'
  | 'sandbox'
  | 'trusted-types'
  | 'require-trusted-types-for';

interface DirectiveDefinition {
  title: string;
  description: string;
  type: DirectiveType;
  suggestions: string[];
}

const directiveLibrary = {
  'default-src': {
    title: 'default-src',
    description: 'Fallback sources that apply when a more specific directive is missing.',
    type: 'general-source',
    suggestions: ["'self'", 'https://cdn.example.com', 'data:'],
  },
  'script-src': {
    title: 'script-src',
    description: 'Controls where scripts can execute from.',
    type: 'script-source',
    suggestions: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://scripts.example.com'],
  },
  'style-src': {
    title: 'style-src',
    description: 'Controls allowed style sheets.',
    type: 'style-source',
    suggestions: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  },
  'img-src': {
    title: 'img-src',
    description: 'Images, favicons, and other media.',
    type: 'general-source',
    suggestions: ["'self'", 'data:', 'https://images.example.com'],
  },
  'font-src': {
    title: 'font-src',
    description: 'Web font sources.',
    type: 'general-source',
    suggestions: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  },
  'connect-src': {
    title: 'connect-src',
    description: 'XHR, fetch, WebSocket, and EventSource endpoints.',
    type: 'general-source',
    suggestions: ["'self'", 'https://api.example.com', 'wss://realtime.example.com'],
  },
  'frame-src': {
    title: 'frame-src',
    description: 'Allowed iframes and embedded browsing contexts.',
    type: 'general-source',
    suggestions: ['https://player.example.com', 'https://widgets.example.com'],
  },
  'frame-ancestors': {
    title: 'frame-ancestors',
    description: 'Where this document may be embedded.',
    type: 'ancestor-source',
    suggestions: ["'self'", 'https://app.example.com'],
  },
  'media-src': {
    title: 'media-src',
    description: 'Audio and video sources.',
    type: 'general-source',
    suggestions: ["'self'", 'https://media.example.com'],
  },
  'object-src': {
    title: 'object-src',
    description: 'Plugins, Flash, and other object embeds.',
    type: 'general-source',
    suggestions: ["'none'"],
  },
  'worker-src': {
    title: 'worker-src',
    description: 'Web worker and shared worker sources.',
    type: 'general-source',
    suggestions: ["'self'", 'blob:'],
  },
  'manifest-src': {
    title: 'manifest-src',
    description: 'Application manifest locations.',
    type: 'general-source',
    suggestions: ["'self'"],
  },
  'base-uri': {
    title: 'base-uri',
    description: 'Origins allowed in the <base> tag.',
    type: 'general-source',
    suggestions: ["'self'", "'none'"],
  },
  'form-action': {
    title: 'form-action',
    description: 'Where forms may submit.',
    type: 'general-source',
    suggestions: ["'self'", 'https://payments.example.com'],
  },
  'report-uri': {
    title: 'report-uri',
    description: 'Legacy reporting endpoint. Prefer report-to when available.',
    type: 'report-uri',
    suggestions: ['https://reports.example.com/csp'],
  },
  'report-to': {
    title: 'report-to',
    description: 'Reporting API group name for CSP violations.',
    type: 'report-to',
    suggestions: ['csp-endpoint'],
  },
  sandbox: {
    title: 'sandbox',
    description: 'Document sandbox flags applied to iframes and the current page.',
    type: 'sandbox',
    suggestions: [
      'allow-scripts',
      'allow-same-origin',
      'allow-popups',
      'allow-downloads-without-user-activation',
    ],
  },
  'trusted-types': {
    title: 'trusted-types',
    description: 'Trusted Types policy names that may be created.',
    type: 'trusted-types',
    suggestions: ['default', 'appPolicies', 'allow-duplicates'],
  },
  'require-trusted-types-for': {
    title: 'require-trusted-types-for',
    description: 'Require Trusted Types for specific sinks.',
    type: 'require-trusted-types-for',
    suggestions: ["'script'"],
  },
  'block-all-mixed-content': {
    title: 'block-all-mixed-content',
    description: 'Block HTTP subresources on HTTPS pages.',
    type: 'no-value',
    suggestions: [],
  },
  'upgrade-insecure-requests': {
    title: 'upgrade-insecure-requests',
    description: 'Upgrade HTTP requests to HTTPS automatically.',
    type: 'no-value',
    suggestions: [],
  },
  'script-src-elem': {
    title: 'script-src-elem',
    description: 'Element-specific script sources.',
    type: 'script-source',
    suggestions: ["'self'", "'unsafe-inline'", 'https://scripts.example.com'],
  },
  'script-src-attr': {
    title: 'script-src-attr',
    description: 'Inline script attribute sources.',
    type: 'script-source',
    suggestions: ["'self'", "'unsafe-inline'"],
  },
  'style-src-elem': {
    title: 'style-src-elem',
    description: 'Element-specific style sheet sources.',
    type: 'style-source',
    suggestions: ["'self'", 'https://fonts.googleapis.com'],
  },
  'style-src-attr': {
    title: 'style-src-attr',
    description: 'Inline style attribute sources.',
    type: 'style-source',
    suggestions: ["'self'", "'unsafe-inline'"],
  },
} as const satisfies Record<string, DirectiveDefinition>;

type DirectiveName = keyof typeof directiveLibrary;

const directiveNameList = Object.keys(directiveLibrary) as DirectiveName[];
const directiveEnum = z.enum(directiveNameList as [DirectiveName, ...DirectiveName[]]);

export interface DirectiveValue {
  id: string;
  name: DirectiveName;
  tokens: string[];
}

type TokenErrorMap = Record<number, string[]>;

interface DirectiveErrorEntry {
  directive: string[];
  tokens: TokenErrorMap;
}

export interface ValidationErrors {
  global: string[];
  byId: Record<string, DirectiveErrorEntry>;
}

export interface DirectiveEditorState {
  directives: DirectiveValue[];
  csp: string;
  isValid: boolean;
  errors: ValidationErrors;
}

interface DirectiveEditorProps {
  initialDirectives?: DirectiveValue[];
  onStateChange?: (state: DirectiveEditorState) => void;
}

const SANDBOX_TOKENS = new Set([
  'allow-downloads-without-user-activation',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
]);

const TRUSTED_TYPES_SPECIAL = new Set(['none', "'none'", 'allow-duplicates']);

const KEYWORD_ALIASES = new Map<string, string>([
  ['self', "'self'"],
  ['none', "'none'"],
  ['unsafe-inline', "'unsafe-inline'"],
  ['unsafe-eval', "'unsafe-eval'"],
  ['unsafe-hashes', "'unsafe-hashes'"],
  ['unsafe-allow-redirects', "'unsafe-allow-redirects'"],
  ['strict-dynamic', "'strict-dynamic'"],
  ['report-sample', "'report-sample'"],
  ['wasm-unsafe-eval', "'wasm-unsafe-eval'"],
  ['script', "'script'"],
]);

const isNonce = (token: string) => /^'nonce-[A-Za-z0-9+\/=\-_]+'$/.test(token);
const isHash = (token: string) => /^'sha(256|384|512)-[A-Za-z0-9+/=]+'$/.test(token);
const isScheme = (token: string) => /^[a-z][a-z0-9+\-.]*:$/i.test(token);
const isAbsoluteUrl = (token: string) => /^[a-z][a-z0-9+\-.]*:\/\//i.test(token);
const isHostSource = (token: string) =>
  /^(\*|\*\.[A-Za-z0-9.-]+|[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*)(:\d+)?(\/.*)?$/.test(token);
const isRelativeUrl = (token: string) => token.startsWith('/') && !token.startsWith('//');

const generalKeywordSet = new Set(["'self'", "'none'", '*']);
const scriptKeywordSet = new Set([
  "'self'",
  "'none'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "'unsafe-hashes'",
  "'strict-dynamic'",
  "'report-sample'",
  "'wasm-unsafe-eval'",
  "'unsafe-allow-redirects'",
]);
const styleKeywordSet = new Set(["'self'", "'none'", "'unsafe-inline'", "'unsafe-hashes'", "'report-sample'"]);
const ancestorKeywordSet = new Set(["'self'", "'none'"]);

const isGeneralSourceToken = (token: string) =>
  generalKeywordSet.has(token) || isScheme(token) || isAbsoluteUrl(token) || isHostSource(token);
const isScriptSourceToken = (token: string) =>
  scriptKeywordSet.has(token) || isNonce(token) || isHash(token) || isGeneralSourceToken(token);
const isStyleSourceToken = (token: string) =>
  styleKeywordSet.has(token) || isNonce(token) || isHash(token) || isGeneralSourceToken(token);
const isAncestorSourceToken = (token: string) => ancestorKeywordSet.has(token) || isHostSource(token);

const isReportUriToken = (token: string) => isAbsoluteUrl(token) || isRelativeUrl(token);
const isReportToToken = (token: string) => /^[A-Za-z0-9_-]{1,64}$/.test(token);
const isTrustedTypesToken = (token: string) =>
  TRUSTED_TYPES_SPECIAL.has(token) || /^[A-Za-z0-9_.-]{1,64}$/.test(token);
const isRequireTrustedTypesToken = (token: string) => token === "'script'";

const directiveItemSchema = z.object({
  id: z.string(),
  name: directiveEnum,
  tokens: z.array(z.string()),
});

const directiveListSchema = z.array(directiveItemSchema).superRefine((items, ctx) => {
  const seen = new Map<DirectiveName, number>();

  items.forEach((directive, index) => {
    if (seen.has(directive.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'name'],
        message: 'Directive already defined above.',
      });
    } else {
      seen.set(directive.name, index);
    }

    const def = directiveLibrary[directive.name];
    const tokens = directive.tokens;
    if (def.type === 'no-value') {
      if (tokens.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'tokens'],
          message: `${directive.name} does not accept values.`,
        });
      }
      return;
    }

    if (tokens.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'tokens'],
        message: `${directive.name} requires at least one value.`,
      });
      return;
    }

    tokens.forEach((token, tokenIndex) => {
      const value = token.trim();
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'tokens', tokenIndex],
          message: 'Empty values are not allowed.',
        });
        return;
      }

      let valid = false;
      if (def.type === 'general-source') {
        valid = isGeneralSourceToken(value);
      } else if (def.type === 'script-source') {
        valid = isScriptSourceToken(value);
      } else if (def.type === 'style-source') {
        valid = isStyleSourceToken(value);
      } else if (def.type === 'ancestor-source') {
        valid = isAncestorSourceToken(value);
      } else if (def.type === 'report-uri') {
        valid = isReportUriToken(value);
      } else if (def.type === 'report-to') {
        valid = isReportToToken(value);
      } else if (def.type === 'sandbox') {
        valid = SANDBOX_TOKENS.has(value);
      } else if (def.type === 'trusted-types') {
        valid = isTrustedTypesToken(value);
      } else if (def.type === 'require-trusted-types-for') {
        valid = isRequireTrustedTypesToken(value);
      }

      if (!valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'tokens', tokenIndex],
          message: `${value} is not allowed for ${directive.name}.`,
        });
      }
    });

    if (tokens.includes("'none'")) {
      const count = tokens.filter((token) => token === "'none'").length;
      if (tokens.length > count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'tokens'],
          message: "'none' cannot be combined with other sources.",
        });
      }
    }
  });
});

const createId = () => `dir-${Math.random().toString(36).slice(2, 10)}`;

const defaultDirectives: DirectiveValue[] = [
  { id: createId(), name: 'default-src', tokens: ["'self'"] },
  { id: createId(), name: 'script-src', tokens: ["'self'"] },
  { id: createId(), name: 'style-src', tokens: ["'self'"] },
];

const normalizeToken = (raw: string) => {
  const trimmed = raw.trim().replace(/;+$/, '');
  if (!trimmed) {
    return '';
  }
  const alias = KEYWORD_ALIASES.get(trimmed.toLowerCase());
  return alias ?? trimmed;
};

const buildErrorState = (
  issues: ZodIssue[],
  directives: DirectiveValue[],
): ValidationErrors => {
  const byId: Record<string, DirectiveErrorEntry> = {};
  const global: string[] = [];

  issues.forEach((issue) => {
    const [directiveIndex, field, tokenIndex] = issue.path;
    if (typeof directiveIndex !== 'number') {
      global.push(issue.message);
      return;
    }

    const directive = directives[directiveIndex];
    if (!directive) {
      global.push(issue.message);
      return;
    }

    if (!byId[directive.id]) {
      byId[directive.id] = { directive: [], tokens: {} };
    }

    if (field === 'name') {
      byId[directive.id].directive.push(issue.message);
      return;
    }

    if (field === 'tokens') {
      if (typeof tokenIndex === 'number') {
        const existing = byId[directive.id].tokens[tokenIndex] ?? [];
        byId[directive.id].tokens[tokenIndex] = [...existing, issue.message];
      } else {
        byId[directive.id].directive.push(issue.message);
      }
      return;
    }

    byId[directive.id].directive.push(issue.message);
  });

  return { global, byId };
};

const serializePolicy = (items: DirectiveValue[]) =>
  items
    .map((directive) =>
      directive.tokens.length
        ? `${directive.name} ${directive.tokens.join(' ')}`
        : `${directive.name}`,
    )
    .join('; ');

const DirectiveEditor: React.FC<DirectiveEditorProps> = ({
  initialDirectives,
  onStateChange,
}) => {
  const [directives, setDirectives] = useState<DirectiveValue[]>(() => {
    if (initialDirectives && initialDirectives.length > 0) {
      return initialDirectives.map((directive) => ({
        id: directive.id ?? createId(),
        name: directive.name,
        tokens: directive.tokens.map(normalizeToken).filter(Boolean),
      }));
    }
    return defaultDirectives.map((directive) => ({ ...directive, id: createId() }));
  });
  const [pendingTokens, setPendingTokens] = useState<Record<string, string>>({});

  const sanitizedDirectives = useMemo(
    () =>
      directives.map((directive) => ({
        ...directive,
        tokens: directive.tokens.map((token) => normalizeToken(token)).filter(Boolean),
      })),
    [directives],
  );

  const validation = useMemo<DirectiveEditorState>(() => {
    const parseResult = directiveListSchema.safeParse(sanitizedDirectives);
    if (!parseResult.success) {
      return {
        directives: sanitizedDirectives,
        csp: '',
        isValid: false,
        errors: buildErrorState(parseResult.error.issues, sanitizedDirectives),
      };
    }

    const validDirectives = parseResult.data;
    return {
      directives: validDirectives,
      csp: serializePolicy(validDirectives),
      isValid: true,
      errors: { global: [], byId: {} },
    };
  }, [sanitizedDirectives]);

  useEffect(() => {
    onStateChange?.(validation);
  }, [onStateChange, validation]);

  const availableDirectives = useMemo(
    () =>
      directiveNameList.filter(
        (name) => !directives.some((directive) => directive.name === name),
      ),
    [directives],
  );

  const handleDirectiveChange = useCallback(
    (id: string, name: DirectiveName) => {
      setDirectives((prev) =>
        prev.map((directive) => {
          if (directive.id !== id) {
            return directive;
          }
          const definition = directiveLibrary[name];
          const tokens = definition.type === 'no-value' ? [] : directive.tokens;
          return { ...directive, name, tokens };
        }),
      );
    },
    [],
  );

  const handleRemoveDirective = useCallback((id: string) => {
    setDirectives((prev) => prev.filter((directive) => directive.id !== id));
    setPendingTokens((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const handleAddDirective = useCallback(() => {
    const nextName = availableDirectives[0] ?? 'default-src';
    const definition = directiveLibrary[nextName];
    const defaults =
      definition.type === 'no-value'
        ? []
        : definition.suggestions.includes("'self'")
        ? ["'self'"]
        : [];
    setDirectives((prev) => [
      ...prev,
      {
        id: createId(),
        name: nextName,
        tokens: defaults,
      },
    ]);
  }, [availableDirectives]);

  const handleTokenInputChange = useCallback((id: string, value: string) => {
    setPendingTokens((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleAddToken = useCallback((id: string, rawToken?: string) => {
    setDirectives((prev) =>
      prev.map((directive) => {
        if (directive.id !== id) {
          return directive;
        }
        const input = rawToken ?? pendingTokens[id] ?? '';
        const additions = input
          .split(/[\s,]+/)
          .map(normalizeToken)
          .filter(Boolean);
        if (additions.length === 0) {
          return directive;
        }
        const unique = new Set(directive.tokens);
        additions.forEach((token) => unique.add(token));
        return { ...directive, tokens: Array.from(unique) };
      }),
    );
    setPendingTokens((prev) => ({ ...prev, [id]: '' }));
  }, [pendingTokens]);

  const handleTokenRemove = useCallback((id: string, token: string) => {
    setDirectives((prev) =>
      prev.map((directive) =>
        directive.id === id
          ? {
              ...directive,
              tokens: directive.tokens.filter((existing) => existing !== token),
            }
          : directive,
      ),
    );
  }, []);

  const handleTokenInputKeyDown = useCallback(
    (id: string, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        handleAddToken(id);
      }
    },
    [handleAddToken],
  );

  return (
    <div className="space-y-6">
      {validation.errors.global.length > 0 && (
        <div className="rounded border border-yellow-600 bg-yellow-900/30 p-3 text-sm text-yellow-100">
          <h2 className="font-semibold">Validation issues</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validation.errors.global.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {directives.map((directive) => {
        const definition = directiveLibrary[directive.name];
        const errorEntry = validation.errors.byId[directive.id];
        const pendingValue = pendingTokens[directive.id] ?? '';
        return (
          <div
            key={directive.id}
            className="rounded border border-gray-700 bg-gray-900 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <label className="flex-1 text-sm font-semibold text-gray-200">
                <span className="mb-1 block text-xs uppercase tracking-wide text-gray-400">
                  Directive
                </span>
                <select
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
                  value={directive.name}
                  onChange={(event) =>
                    handleDirectiveChange(
                      directive.id,
                      event.target.value as DirectiveName,
                    )
                  }
                >
                  {directiveNameList.map((name) => {
                    const disabled =
                      name !== directive.name &&
                      directives.some((item) => item.name === name);
                    return (
                      <option key={name} value={name} disabled={disabled}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </label>
              <button
                type="button"
                onClick={() => handleRemoveDirective(directive.id)}
                className="self-start rounded border border-red-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-300">{definition.description}</p>

            {errorEntry?.directive.length ? (
              <ul className="mt-2 space-y-1 text-xs text-red-300">
                {errorEntry.directive.map((message, index) => (
                  <li key={index}>• {message}</li>
                ))}
              </ul>
            ) : null}

            {definition.type !== 'no-value' && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {directive.tokens.map((token, index) => {
                    const tokenErrors = errorEntry?.tokens[index];
                    return (
                      <span
                        key={`${token}-${index}`}
                        className={`group inline-flex items-center rounded border px-2 py-1 text-xs font-mono ${
                          tokenErrors && tokenErrors.length
                            ? 'border-red-500 bg-red-900/30 text-red-100'
                            : 'border-gray-700 bg-gray-800 text-gray-100'
                        }`}
                      >
                        {token}
                        <button
                          type="button"
                          onClick={() => handleTokenRemove(directive.id, token)}
                          className="ml-2 rounded bg-transparent p-0.5 text-[10px] text-gray-400 transition hover:text-white"
                          aria-label={`Remove ${token}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                {Object.values(errorEntry?.tokens ?? {}).flat().length > 0 && (
                  <ul className="space-y-1 text-xs text-red-300">
                    {Object.entries(errorEntry?.tokens ?? {}).map(([tokenIndex, messages]) => (
                      <li key={tokenIndex}>
                        <span className="font-mono text-red-200">
                          {directive.tokens[Number(tokenIndex)] ?? 'value'}
                        </span>{' '}
                        — {messages.join(' ')}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <input
                    type="text"
                    value={pendingValue}
                    onChange={(event) =>
                      handleTokenInputChange(directive.id, event.target.value)
                    }
                    onKeyDown={(event) => handleTokenInputKeyDown(directive.id, event)}
                    placeholder="Add value and press Enter"
                    className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddToken(directive.id)}
                    className="rounded border border-sky-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/10"
                  >
                    Add
                  </button>
                </div>

                {definition.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Suggestions</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {definition.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleAddToken(directive.id, suggestion)}
                          className="rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 transition hover:border-sky-500 hover:text-sky-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {definition.type === 'no-value' && (
              <p className="mt-4 text-xs text-gray-400">
                This directive is a boolean flag and does not accept any tokens.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleAddDirective}
        disabled={availableDirectives.length === 0}
        className="rounded border border-gray-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-100 transition hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
      >
        Add directive
      </button>
      {availableDirectives.length === 0 && (
        <p className="text-xs text-gray-400">
          All supported directives are already in the policy.
        </p>
      )}
    </div>
  );
};

export default DirectiveEditor;
