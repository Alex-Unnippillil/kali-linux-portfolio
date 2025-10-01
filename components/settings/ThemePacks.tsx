import type { CSSProperties } from 'react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface ThemePack {
  name: string;
  version: number;
  createdAt: string;
  variables: Record<string, string>;
  css: string;
}

export interface ThemePackValidationResult {
  valid: boolean;
  errors: string[];
  pack?: ThemePack;
}

const PACK_STORAGE_KEY = 'app:theme-packs';
const ACTIVE_PACK_KEY = 'app:active-theme-pack';
const STYLE_ELEMENT_ID = 'theme-pack-style';

const CSS_VARIABLE_KEYS = [
  '--color-bg',
  '--color-text',
  '--color-primary',
  '--color-secondary',
  '--color-accent',
  '--color-muted',
  '--color-surface',
  '--color-inverse',
  '--color-border',
  '--color-terminal',
  '--color-dark',
  '--color-focus-ring',
  '--color-selection',
  '--color-control-accent',
  '--color-ub-grey',
  '--color-ub-warm-grey',
  '--color-ub-cool-grey',
  '--color-ub-orange',
  '--color-ub-lite-abrgn',
  '--color-ub-med-abrgn',
  '--color-ub-drk-abrgn',
  '--color-ub-window-title',
  '--color-ub-gedit-dark',
  '--color-ub-gedit-light',
  '--color-ub-gedit-darker',
  '--color-ubt-grey',
  '--color-ubt-warm-grey',
  '--color-ubt-cool-grey',
  '--color-ubt-blue',
  '--color-ubt-green',
  '--color-ubt-gedit-orange',
  '--color-ubt-gedit-blue',
  '--color-ubt-gedit-dark',
  '--color-ub-border-orange',
  '--color-ub-dark-grey',
  '--kali-bg',
  '--kali-blue',
  '--kali-blue-dark',
  '--kali-blue-glow',
  '--kali-bg-solid',
  '--kali-panel',
  '--kali-panel-border',
  '--kali-panel-highlight',
  '--kali-terminal-green',
  '--kali-terminal-text',
  '--game-color-secondary',
  '--game-color-success',
  '--game-color-warning',
  '--game-color-danger',
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-mobile-1',
  '--space-mobile-2',
  '--space-mobile-3',
  '--space-mobile-4',
  '--space-mobile-5',
  '--space-mobile-6',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--radius-6',
  '--radius-round',
  '--shadow-2',
  '--color-window-border',
  '--color-window-accent',
  '--motion-fast',
  '--motion-medium',
  '--motion-slow',
  '--font-family-base',
  '--font-multiplier',
  '--hit-area',
  '--focus-outline-color',
  '--focus-outline-width',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sanitizeCss = (css: string): string => css.replace(/\u0000/g, '').trim();

const hasMaliciousContent = (css: string): boolean => /<\/?script/i.test(css) || /url\(['\"]?javascript:/i.test(css);

export const validateThemePack = (raw: unknown): ThemePackValidationResult => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    errors.push('Theme pack must be an object.');
    return { valid: false, errors };
  }

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) {
    errors.push('Theme pack requires a non-empty "name" field.');
  }

  const version = Number(raw.version ?? 1);
  if (!Number.isFinite(version) || version < 1) {
    errors.push('Theme pack "version" must be a positive number.');
  }

  const variablesInput = raw.variables;
  if (!isRecord(variablesInput) || Object.keys(variablesInput).length === 0) {
    errors.push('Theme pack must include a "variables" map.');
  }

  const variables: Record<string, string> = {};
  if (isRecord(variablesInput)) {
    for (const [key, value] of Object.entries(variablesInput)) {
      if (!key.startsWith('--')) {
        errors.push(`Invalid variable name: ${key}.`);
        continue;
      }
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`Variable ${key} must be a non-empty string.`);
        continue;
      }
      if (value.length > 200) {
        errors.push(`Variable ${key} value is too long.`);
        continue;
      }
      variables[key] = value.trim();
    }
  }

  const css = typeof raw.css === 'string' ? sanitizeCss(raw.css) : '';
  if (!css) {
    errors.push('Theme pack must include a "css" string.');
  } else if (hasMaliciousContent(css)) {
    errors.push('CSS contains disallowed content.');
  }

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    pack: {
      name,
      version,
      createdAt,
      variables,
      css,
    },
  };
};

const createCssFromVariables = (variables: Record<string, string>): string => {
  const rules = Object.entries(variables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `:root {\n${rules}\n}`;
};

const collectCurrentVariables = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const computed = getComputedStyle(document.documentElement);
  return CSS_VARIABLE_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = computed.getPropertyValue(key).trim();
    if (value) acc[key] = value;
    return acc;
  }, {});
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const applyThemePackToDocument = (pack: ThemePack | null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const existing = document.getElementById(STYLE_ELEMENT_ID);
  if (existing) existing.remove();
  CSS_VARIABLE_KEYS.forEach((key) => {
    root.style.removeProperty(key);
  });

  if (!pack) {
    root.removeAttribute('data-theme-pack');
    return;
  }

  Object.entries(pack.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  const styleElement = document.createElement('style');
  styleElement.id = STYLE_ELEMENT_ID;
  styleElement.textContent = pack.css;
  document.head.appendChild(styleElement);
  root.setAttribute('data-theme-pack', pack.name);
};

const isBrowser = () => typeof window !== 'undefined';

const getStoredPacks = (): Record<string, ThemePack> => {
  if (!isBrowser()) return {};
  try {
    const stored = window.localStorage.getItem(PACK_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!isRecord(parsed)) return {};
    return Object.entries(parsed).reduce<Record<string, ThemePack>>((acc, [key, value]) => {
      const result = validateThemePack(value);
      if (result.valid && result.pack) {
        acc[key] = result.pack;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const getStoredActivePack = (): string | null => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_PACK_KEY);
  } catch {
    return null;
  }
};

const persistPacks = (packs: Record<string, ThemePack>) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PACK_STORAGE_KEY, JSON.stringify(packs));
  } catch {
    /* ignore */
  }
};

const persistActivePack = (name: string | null) => {
  if (!isBrowser()) return;
  try {
    if (name) {
      window.localStorage.setItem(ACTIVE_PACK_KEY, name);
    } else {
      window.localStorage.removeItem(ACTIVE_PACK_KEY);
    }
  } catch {
    /* ignore */
  }
};

const downloadPack = (pack: ThemePack) => {
  if (!isBrowser()) return;
  const data = JSON.stringify(pack, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = slugify(pack.name) || 'theme-pack';
  link.href = url;
  link.download = `${safeName}.theme.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface PreviewSandboxProps {
  pack?: ThemePack | null;
}

export const PreviewSandbox = ({ pack }: PreviewSandboxProps) => {
  const style = useMemo<((CSSProperties & Record<string, string>) | undefined)>(() => {
    if (!pack) return undefined;
    const result: CSSProperties & Record<string, string> = {} as CSSProperties & Record<string, string>;
    Object.entries(pack.variables).forEach(([key, value]) => {
      (result as Record<string, string>)[key] = value;
    });
    return result;
  }, [pack]);

  if (!pack) {
    return (
      <div data-testid="theme-preview-empty" className="border border-dashed border-gray-500 rounded p-4 text-sm text-gray-300">
        Import a theme pack to preview its colors.
      </div>
    );
  }

  return (
    <div data-testid="theme-preview" className="rounded border border-gray-600 overflow-hidden" style={style}>
      <div className="p-4" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
        <h3 className="text-lg font-semibold mb-2">{pack.name} Preview</h3>
        <p className="mb-2">
          Primary accent <span className="font-mono">{pack.variables['--color-primary']}</span>
        </p>
        <button
          type="button"
          className="px-3 py-1 rounded"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-inverse, #000)',
            border: `1px solid var(--color-border)`,
          }}
        >
          Button example
        </button>
      </div>
      <div className="p-4 bg-[color:var(--color-surface,#1a1f26)] text-[color:var(--color-text,#f5f5f5)]">
        <p>Surface preview with muted text and border tokens.</p>
      </div>
    </div>
  );
};

const ThemePacks = () => {
  const [packs, setPacks] = useState<Record<string, ThemePack>>({});
  const [activePackName, setActivePackName] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [exportName, setExportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = getStoredPacks();
    setPacks(stored);
    const active = getStoredActivePack();
    setActivePackName(active);
    setPreviewName(active);
    const pack = active ? stored[active] ?? null : null;
    applyThemePackToDocument(pack ?? null);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistPacks(packs);
  }, [packs]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistActivePack(activePackName);
    const pack = activePackName ? packs[activePackName] ?? null : null;
    applyThemePackToDocument(pack ?? null);
  }, [activePackName, packs]);

  const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setStatus(null);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validation = validateThemePack(parsed);
      if (!validation.valid || !validation.pack) {
        setError(validation.errors.join(' '));
        return;
      }
      setPacks((prev) => ({ ...prev, [validation.pack!.name]: validation.pack! }));
      setPreviewName(validation.pack.name);
      setStatus(`Imported theme pack "${validation.pack.name}". Preview it before applying.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to import theme pack.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  const handleApply = useCallback((name: string) => {
    if (!packs[name]) {
      setError(`Theme pack "${name}" could not be found.`);
      return;
    }
    setActivePackName(name);
    setStatus(`Applied theme pack "${name}".`);
  }, [packs]);

  const handleClear = useCallback(() => {
    setActivePackName(null);
    setPreviewName(null);
    setStatus('Reverted to built-in theme.');
  }, []);

  const handleExport = useCallback(() => {
    setError(null);
    setStatus(null);
    if (!isBrowser()) {
      setError('Export is only available in the browser.');
      return;
    }
    const name = exportName.trim() || 'Custom Theme Pack';
    const variables = collectCurrentVariables();
    if (Object.keys(variables).length === 0) {
      setError('Unable to read CSS variables for export.');
      return;
    }
    const css = createCssFromVariables(variables);
    const pack: ThemePack = {
      name,
      version: 1,
      createdAt: new Date().toISOString(),
      variables,
      css,
    };
    setPacks((prev) => ({ ...prev, [name]: pack }));
    setPreviewName(name);
    setStatus(`Exported theme pack "${name}".`);
    downloadPack(pack);
  }, [exportName]);

  const previewPack = previewName ? packs[previewName] ?? null : null;
  const activePack = activePackName ? packs[activePackName] ?? null : null;

  return (
    <section aria-labelledby="theme-packs-heading" className="space-y-4">
      <div>
        <h2 id="theme-packs-heading" className="text-xl font-semibold text-white">
          Theme packs
        </h2>
        <p className="text-sm text-gray-300">
          Import JSON theme packs, preview them safely, then apply to customize your desktop.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-200" htmlFor="theme-pack-import">
              Import theme pack
            </label>
            <input
              id="theme-pack-import"
              ref={fileInputRef}
              type="file"
              accept="application/json,.json,.theme.json"
              aria-label="Import theme pack file"
              onChange={handleImport}
              className="mt-1 block w-full text-sm text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200" htmlFor="theme-pack-export-name">
              Export current theme as
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="theme-pack-export-name"
                type="text"
                placeholder="Custom theme name"
                value={exportName}
                aria-label="Theme pack export name"
                onChange={(event) => setExportName(event.target.value)}
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-2 py-1 text-sm text-gray-100"
              />
              <button
                type="button"
                onClick={handleExport}
                className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1 text-sm text-white"
              >
                Export
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded border border-red-600 bg-red-900/40 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {status && (
            <div className="rounded border border-emerald-600 bg-emerald-900/40 p-3 text-sm text-emerald-200">
              {status}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-200">Your theme packs</h3>
            {Object.keys(packs).length === 0 ? (
              <p className="text-sm text-gray-400">No theme packs imported yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {Object.values(packs)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((pack) => (
                    <li key={pack.name} className="flex items-center justify-between rounded border border-gray-700 px-3 py-2 text-sm text-gray-100">
                      <div>
                        <p className="font-medium">{pack.name}</p>
                        <p className="text-xs text-gray-400">Last updated {new Date(pack.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewName(pack.name)}
                          className={`rounded px-2 py-1 text-xs ${
                            previewName === pack.name ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-200'
                          }`}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApply(pack.name)}
                          className={`rounded px-2 py-1 text-xs ${
                            activePackName === pack.name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
                          }`}
                        >
                          {activePackName === pack.name ? 'Active' : 'Apply'}
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-gray-300 underline hover:text-white"
            >
              Revert to built-in theme
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-200">Preview</h3>
          <PreviewSandbox pack={previewPack} />
          {activePack && (
            <p className="text-xs text-gray-400">
              Active pack: <span className="font-medium text-gray-200">{activePack.name}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ThemePacks;

