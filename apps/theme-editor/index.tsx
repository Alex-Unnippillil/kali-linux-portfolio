'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { THEME_TOKENS, type ThemeToken } from './tokens';
import { fallbackCopy, normalizeHex, slugify } from './utils';

type ExportKind = 'css' | 'tailwind';
type CopyStatus = 'idle' | 'copied' | 'error';

type CopyState = Record<ExportKind, CopyStatus>;

type TokenGroup = {
  title: string;
  category: ThemeToken['category'];
};

const TOKEN_GROUPS: TokenGroup[] = [
  { title: 'Core palette', category: 'Core' },
  { title: 'Surface & chrome', category: 'Surfaces' },
  { title: 'State & interaction', category: 'State' },
];

const THEME_NAME_LABEL_ID = 'theme-editor-name-label';
const CSS_EXPORT_HEADING_ID = 'theme-editor-css-export';
const TAILWIND_HEADING_ID = 'theme-editor-tailwind-export';

const createDefaultValues = () =>
  THEME_TOKENS.reduce<Record<string, string>>((acc, token) => {
    acc[token.cssVar] = token.defaultValue;
    return acc;
  }, {});

const buildPreviewStyle = (values: Record<string, string>): CSSProperties => {
  const style: Record<string, string> = {};
  THEME_TOKENS.forEach((token) => {
    style[token.cssVar] = values[token.cssVar];
  });
  return style as CSSProperties;
};

const makeVariableName = (slug: string) => {
  const camel = slug.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  if (/^[a-zA-Z]/.test(camel)) {
    return `${camel}Colors`;
  }
  if (!camel) {
    return 'customColors';
  }
  const capitalised = camel.charAt(0).toUpperCase() + camel.slice(1);
  return `theme${capitalised}Colors`;
};

const ThemeEditor = () => {
  const [themeName, setThemeName] = useState('Custom');
  const [values, setValues] = useState<Record<string, string>>(() => createDefaultValues());
  const [drafts, setDrafts] = useState<Record<string, string>>(() => createDefaultValues());
  const [copyState, setCopyState] = useState<CopyState>({ css: 'idle', tailwind: 'idle' });
  const timeouts = useRef<Record<ExportKind, number | undefined>>({ css: undefined, tailwind: undefined });

  useEffect(
    () => () => {
      Object.values(timeouts.current).forEach((timeoutId) => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    },
    [],
  );

  const updateToken = (cssVar: string, next: string) => {
    setValues((prev) => ({ ...prev, [cssVar]: next }));
    setDrafts((prev) => ({ ...prev, [cssVar]: next }));
  };

  const handleColorChange = (token: ThemeToken, next: string) => {
    const normalised = normalizeHex(next);
    if (normalised) {
      updateToken(token.cssVar, normalised);
    }
  };

  const handleTextChange = (token: ThemeToken, next: string) => {
    setDrafts((prev) => ({ ...prev, [token.cssVar]: next }));
  };

  const handleTextBlur = (token: ThemeToken) => {
    const candidate = drafts[token.cssVar];
    const normalised = normalizeHex(candidate);
    if (normalised) {
      updateToken(token.cssVar, normalised);
    } else {
      setDrafts((prev) => ({ ...prev, [token.cssVar]: values[token.cssVar] }));
    }
  };

  const resetTheme = () => {
    const defaults = createDefaultValues();
    setValues(defaults);
    setDrafts(defaults);
    setThemeName('Custom');
  };

  const displayName = themeName.trim() || 'Custom';
  const slug = useMemo(() => {
    const next = slugify(themeName);
    return next || 'custom';
  }, [themeName]);

  const cssOutput = useMemo(() => {
    const variableLines = THEME_TOKENS.map(
      (token) => `  ${token.cssVar}: ${values[token.cssVar]};`,
    );
    const fullLines = [
      ...variableLines,
      '  accent-color: var(--color-control-accent);',
    ];
    const scopeSelector = slug === 'default' ? ':root' : `html[data-theme="${slug}"]`;
    const blocks = [
      `/* ${displayName} theme */`,
      `${scopeSelector} {`,
      ...fullLines,
      `}`,
    ];
    if (slug !== 'default') {
      blocks.push(
        '',
        '/* Optional: make this theme the default */',
        ':root {',
        ...fullLines,
        `}`,
      );
    }
    return blocks.join('\n');
  }, [values, slug, displayName]);

  const tailwindSnippet = useMemo(() => {
    const variableName = makeVariableName(slug);
    const colorLines = THEME_TOKENS.filter((token) => token.tailwindKey).map(
      (token) =>
        `  ${token.tailwindKey}: 'var(${token.cssVar})', // ${values[token.cssVar]}`,
    );
    return [
      `// tailwind.config.js snippet for the "${displayName}" palette`,
      `const ${variableName} = {`,
      ...colorLines,
      `};`,
      '',
      'module.exports = {',
      '  theme: {',
      '    extend: {',
      `      colors: ${variableName},`,
      '    },',
      '  },',
      '};',
    ].join('\n');
  }, [values, slug, displayName]);

  const previewStyle = useMemo(() => buildPreviewStyle(values), [values]);

  const copyExport = async (kind: ExportKind) => {
    const text = kind === 'css' ? cssOutput : tailwindSnippet;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyState((prev) => ({ ...prev, [kind]: 'copied' }));
      } else if (fallbackCopy(text)) {
        setCopyState((prev) => ({ ...prev, [kind]: 'copied' }));
      } else {
        throw new Error('Copy not supported');
      }
    } catch (error) {
      console.error('Failed to copy export', error);
      setCopyState((prev) => ({ ...prev, [kind]: 'error' }));
    } finally {
      if (timeouts.current[kind]) {
        window.clearTimeout(timeouts.current[kind]);
      }
      timeouts.current[kind] = window.setTimeout(() => {
        setCopyState((prev) => ({ ...prev, [kind]: 'idle' }));
      }, 2000);
    }
  };

  const downloadExport = (kind: ExportKind) => {
    if (typeof window === 'undefined') return;
    const text = kind === 'css' ? cssOutput : tailwindSnippet;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename =
      kind === 'css'
        ? `${slug || 'theme'}-theme.css`
        : `${slug || 'theme'}-tailwind-snippet.js`;
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderActions = (kind: ExportKind) => {
    const status = copyState[kind];
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => copyExport(kind)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium transition hover:bg-blue-500"
        >
          Copy to clipboard
        </button>
        <button
          type="button"
          onClick={() => downloadExport(kind)}
          className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium transition hover:bg-slate-500"
        >
          Download file
        </button>
        <span
          aria-live="polite"
          className={`text-sm ${
            status === 'copied'
              ? 'text-green-300'
              : status === 'error'
                ? 'text-red-300'
                : 'text-transparent'
          }`}
        >
          {status === 'copied' ? 'Copied!' : status === 'error' ? 'Copy failed' : 'Idle'}
        </span>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-ub-cool-grey p-4 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Theme Editor</h1>
          <p className="text-sm text-white/70">
            Craft a custom Kali-inspired palette, preview it live, and export CSS variables or a Tailwind
            configuration snippet ready for your project.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
          <section className="space-y-4 rounded-lg border border-white/10 bg-black/40 p-4">
            <div className="space-y-2">
              <label
                htmlFor="theme-name"
                id={THEME_NAME_LABEL_ID}
                className="text-sm font-medium"
              >
                Theme name
              </label>
              <input
                id="theme-name"
                type="text"
                value={themeName}
                onChange={(event) => setThemeName(event.target.value)}
                className="w-full rounded border border-white/10 bg-black/60 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Custom"
                aria-labelledby={THEME_NAME_LABEL_ID}
              />
              <p className="text-xs text-white/60">
                Used for the <code>data-theme</code> selector and export filenames.
              </p>
            </div>
            <button
              type="button"
              onClick={resetTheme}
              className="w-full rounded border border-white/10 px-3 py-2 text-sm font-medium transition hover:border-blue-400 hover:text-blue-200"
            >
              Reset to defaults
            </button>
            <div className="space-y-4">
              {TOKEN_GROUPS.map(({ title, category }) => (
                <div key={category} className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                    {title}
                  </h2>
                  <div className="space-y-3">
                    {THEME_TOKENS.filter((token) => token.category === category).map((token) => (
                      <div
                        key={token.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <label htmlFor={`token-${token.id}`} className="text-sm font-medium">
                              {token.label}
                            </label>
                            <p className="text-xs text-white/60">{token.description}</p>
                          </div>
                          <input
                            id={`token-${token.id}`}
                            type="color"
                            value={values[token.cssVar]}
                            onChange={(event) => handleColorChange(token, event.target.value)}
                            className="h-9 w-14 cursor-pointer rounded border border-white/20 bg-transparent p-0"
                            aria-label={`${token.label} color swatch`}
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="text-xs text-white/60">{token.cssVar}</code>
                          <input
                            type="text"
                            value={drafts[token.cssVar]}
                            onChange={(event) => handleTextChange(token, event.target.value)}
                            onBlur={() => handleTextBlur(token)}
                            className="flex-1 rounded border border-white/10 bg-black/60 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                            aria-label={`${token.label} hex value`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div
              className="rounded-lg border border-white/10 bg-black/40 p-4 shadow-lg"
              style={previewStyle}
            >
              <div
                className="rounded-md border"
                style={{
                  backgroundColor: values['--color-bg'],
                  borderColor: values['--color-border'],
                  color: values['--color-text'],
                }}
              >
                <div className="border-b p-4" style={{ borderColor: values['--color-border'] }}>
                  <h2 className="text-lg font-semibold">Preview window</h2>
                  <p className="text-sm text-white/80">
                    Buttons, surfaces and status elements update as you tweak the palette.
                  </p>
                </div>
                <div className="space-y-4 p-4" style={{ backgroundColor: values['--color-surface'] }}>
                  <p>
                    This is sample body copy. Ensure the text remains legible on top of your surface color.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded px-3 py-1.5 text-sm font-semibold shadow"
                      style={{
                        backgroundColor: values['--color-primary'],
                        color: values['--color-inverse'],
                        boxShadow: `0 2px 6px ${values['--color-primary']}40`,
                      }}
                    >
                      Primary action
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-1.5 text-sm font-medium"
                      style={{
                        color: values['--color-text'],
                        borderColor: values['--color-border'],
                        backgroundColor: values['--color-muted'],
                      }}
                    >
                      Muted button
                    </button>
                    <span
                      className="rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: values['--color-accent'],
                        color: values['--color-inverse'],
                      }}
                    >
                      Accent chip
                    </span>
                  </div>
                  <div className="rounded border p-3 text-xs" style={{ borderColor: values['--color-border'] }}>
                    <p className="font-mono" style={{ color: values['--color-terminal'] }}>
                      {'user@portfolio:~$ echo "Cyberpunk vibes"'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between gap-2">
                  <h2 id={CSS_EXPORT_HEADING_ID} className="text-lg font-semibold">
                    CSS variables export
                  </h2>
                <span className="text-xs text-white/60">Selector: {slug === 'default' ? ':root' : `data-theme="${slug}"`}</span>
              </div>
              <textarea
                value={cssOutput}
                readOnly
                rows={Math.max(12, THEME_TOKENS.length + 6)}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-3 h-64 w-full resize-y rounded border border-white/10 bg-black/70 p-3 font-mono text-xs leading-relaxed text-white focus:border-blue-400 focus:outline-none"
                  aria-labelledby={CSS_EXPORT_HEADING_ID}
                />
              {renderActions('css')}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/40 p-4">
              <div className="flex items-center justify-between gap-2">
                  <h2 id={TAILWIND_HEADING_ID} className="text-lg font-semibold">
                    Tailwind config snippet
                  </h2>
                <span className="text-xs text-white/60">Variable name: {makeVariableName(slug)}</span>
              </div>
              <textarea
                value={tailwindSnippet}
                readOnly
                rows={Math.max(10, THEME_TOKENS.filter((token) => token.tailwindKey).length + 8)}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-3 h-56 w-full resize-y rounded border border-white/10 bg-black/70 p-3 font-mono text-xs leading-relaxed text-white focus:border-blue-400 focus:outline-none"
                  aria-labelledby={TAILWIND_HEADING_ID}
                />
              {renderActions('tailwind')}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor;
