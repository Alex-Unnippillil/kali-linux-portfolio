'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { diffLines, type Change } from 'diff';
import { z } from 'zod';

import usePersistentState from '../../hooks/usePersistentState';

const ruleSchema = z
  .object({
    selector: z.string().min(1, 'Selector is required'),
    action: z.enum(['remove', 'replaceText']),
    value: z.string().optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.action === 'replaceText' && !rule.value?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Replacement value is required',
        path: ['value'],
      });
    }
  });

type Rule = z.infer<typeof ruleSchema>;

type Diagnostic = {
  id: string;
  message: string;
  ruleIndex?: number;
  type: 'parse' | 'validation' | 'selector';
};

type DiffChunk = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

interface Preset {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  html: string;
}

const DEFAULT_RULES: Rule[] = [
  { selector: 'script', action: 'remove' },
  { selector: 'h1', action: 'replaceText', value: 'Rewritten Title' },
];

const DEFAULT_HTML = `<h1>Hello</h1>\n<p>Sample <strong>content</strong>.</p>\n<script>alert("xss")</script>`;

const PRESETS: Preset[] = [
  {
    id: 'landing-cleanup',
    name: 'Landing cleanup',
    description: 'Remove scripts and normalize hero copy for a marketing page.',
    rules: [
      { selector: 'script', action: 'remove' },
      { selector: '.hero h1', action: 'replaceText', value: 'Secure your roadmap' },
      { selector: '.cta', action: 'replaceText', value: 'Request a demo' },
    ],
    html: `<main class="hero">\n  <h1>Launch fast</h1>\n  <p>Ship updates in minutes.</p>\n  <a class="cta" href="#demo">Contact sales</a>\n  <script>console.log('track')</script>\n</main>`,
  },
  {
    id: 'newsroom',
    name: 'Newsroom scrub',
    description: 'Strip banners and annotate outbound links for a press feed.',
    rules: [
      { selector: '.ad', action: 'remove' },
      {
        selector: 'a[rel="sponsored"]',
        action: 'replaceText',
        value: '[sponsored link removed]',
      },
      {
        selector: 'header h2',
        action: 'replaceText',
        value: 'Headlines you can trust',
      },
    ],
    html: `<article>\n  <header>\n    <h2>Breaking news</h2>\n  </header>\n  <div class="ad">Buy now</div>\n  <p>Read more at <a rel="sponsored" href="/promo">Promo</a>.</p>\n</article>`,
  },
  {
    id: 'gallery',
    name: 'Gallery placeholders',
    description: 'Replace images with safe captions for a static preview.',
    rules: [
      { selector: 'img', action: 'replaceText', value: '[image removed]' },
      {
        selector: '.caption',
        action: 'replaceText',
        value: 'Gallery item (preview)',
      },
    ],
    html: `<section class="gallery">\n  <figure>\n    <img src="/photo.jpg" alt="Sunset" />\n    <figcaption class="caption">Sunset</figcaption>\n  </figure>\n</section>`,
  },
  {
    id: 'docs',
    name: 'Docs cleanup',
    description: 'Remove inline scripts and update headings in docs pages.',
    rules: [
      { selector: 'script', action: 'remove' },
      { selector: 'h2', action: 'replaceText', value: 'Updated section' },
      { selector: 'code', action: 'replaceText', value: '[code sample]' },
    ],
    html: `<section>\n  <h2>Getting started</h2>\n  <p>Install with <code>npm install</code>.</p>\n  <script>console.log('docs')</script>\n</section>`,
  },
];

type HelpTab = 'selectors' | 'actions' | 'payloads';

type ResultTab = 'output' | 'diff' | 'preview';

const HELP_TABS: ReadonlyArray<{ id: HelpTab; label: string }> = [
  { id: 'selectors', label: 'Selectors' },
  { id: 'actions', label: 'Actions' },
  { id: 'payloads', label: 'Sample payloads' },
];

const RESULT_TABS: ReadonlyArray<{ id: ResultTab; label: string }> = [
  { id: 'output', label: 'Rewritten HTML' },
  { id: 'diff', label: 'Diff' },
  { id: 'preview', label: 'Safe preview' },
];

const SAMPLE_PAYLOAD = `[
  { "selector": "script", "action": "remove" },
  { "selector": "img", "action": "replaceText", "value": "[image removed]" }
]`;

const serialize = (rules: Rule[]) => JSON.stringify(rules, null, 2);

const parseRules = (text: string): { rules: Rule[]; diagnostics: Diagnostic[] } => {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        rules: [],
        diagnostics: [
          {
            id: 'parse-not-array',
            message: 'Rules JSON must be an array of rule objects.',
            type: 'parse',
          },
        ],
      };
    }

    const diagnostics: Diagnostic[] = [];
    const rules: Rule[] = [];

    parsed.forEach((entry, index) => {
      const result = ruleSchema.safeParse(entry);
      if (result.success) {
        rules.push(result.data);
        return;
      }

      result.error.issues.forEach((issue, issueIndex) => {
        const fieldPath = issue.path
          .filter((part) => typeof part === 'string')
          .join('.');
        const suffix = fieldPath ? ` (${fieldPath})` : '';
        diagnostics.push({
          id: `validation-${index}-${issueIndex}`,
          message: `${issue.message}${suffix}`,
          ruleIndex: index,
          type: 'validation',
        });
      });
    });

    return { rules, diagnostics };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Rules JSON is malformed.';
    return {
      rules: [],
      diagnostics: [
        {
          id: 'parse-error',
          message,
          type: 'parse',
        },
      ],
    };
  }
};

const applyRules = (
  html: string,
  rules: Rule[],
): { html: string; diagnostics: Diagnostic[] } => {
  if (typeof DOMParser === 'undefined') {
    return { html, diagnostics: [] };
  }

  const diagnostics: Diagnostic[] = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');

  rules.forEach((rule, index) => {
    let elements: Element[] = [];
    try {
      elements = Array.from(doc.querySelectorAll(rule.selector));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Invalid selector: ${rule.selector}`;
      diagnostics.push({
        id: `selector-${index}`,
        message,
        ruleIndex: index,
        type: 'selector',
      });
      return;
    }

    if (rule.action === 'remove') {
      elements.forEach((element) => element.remove());
      return;
    }

    elements.forEach((element) => {
      element.textContent = rule.value ?? '';
    });
  });

  return { html: doc.body.innerHTML, diagnostics };
};

const focusRingClasses =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg-solid)]';

const textActionButtonBase =
  'rounded border border-[color:var(--kali-border)] px-3 py-1 text-sm font-semibold uppercase tracking-wide transition-colors duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

const primaryActionButton =
  `${textActionButtonBase} bg-[color:var(--color-primary)] text-[color:var(--color-inverse)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-panel))]`;

const secondaryActionButton =
  `${textActionButtonBase} bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--kali-panel-highlight))] text-[color:var(--kali-text)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_68%,rgba(15,148,210,0.22))]`;

const HtmlRewriterApp: React.FC = () => {
  const [persistedRules, setPersistedRules] = usePersistentState<string>(
    'html-rewriter-rules',
    serialize(DEFAULT_RULES),
    (value): value is string => typeof value === 'string',
  );
  const [persistedHtml, setPersistedHtml] = usePersistentState<string>(
    'html-rewriter-html',
    DEFAULT_HTML,
    (value): value is string => typeof value === 'string',
  );

  const [state, dispatch] = useReducer(
    (
      current: {
        draftRules: string;
        draftHtml: string;
        validatedRules: Rule[];
        validationDiagnostics: Diagnostic[];
        rewriteDiagnostics: Diagnostic[];
        resultHtml: string;
        diff: DiffChunk[];
      },
      action:
        | { type: 'setDraftRules'; value: string }
        | { type: 'setDraftHtml'; value: string }
        | { type: 'setValidation'; rules: Rule[]; diagnostics: Diagnostic[] }
        | { type: 'setRewrite'; resultHtml: string; diagnostics: Diagnostic[] }
        | { type: 'setDiff'; diff: DiffChunk[] },
    ) => {
      switch (action.type) {
        case 'setDraftRules':
          return { ...current, draftRules: action.value };
        case 'setDraftHtml':
          return { ...current, draftHtml: action.value };
        case 'setValidation':
          return {
            ...current,
            validatedRules: action.rules,
            validationDiagnostics: action.diagnostics,
          };
        case 'setRewrite':
          return {
            ...current,
            resultHtml: action.resultHtml,
            rewriteDiagnostics: action.diagnostics,
          };
        case 'setDiff':
          return { ...current, diff: action.diff };
        default:
          return current;
      }
    },
    {
      draftRules: persistedRules,
      draftHtml: persistedHtml,
      validatedRules: DEFAULT_RULES,
      validationDiagnostics: [],
      rewriteDiagnostics: [],
      resultHtml: DEFAULT_HTML,
      diff: [],
    },
  );

  const [showHelp, setShowHelp] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState<HelpTab>('selectors');
  const [activeResultTab, setActiveResultTab] = useState<ResultTab>('output');
  const [announce, setAnnounce] = useState('');
  const modalTitleId = useId();
  const modalDescriptionId = useId();
  const helpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const helpTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const resultTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rewriteTimerRef = useRef<number | null>(null);
  const diffTimerRef = useRef<number | null>(null);
  const diffWorkerRef = useRef<Worker | null>(null);
  const diffJobRef = useRef(0);
  const announceTimerRef = useRef<number | null>(null);

  const quickStartOutput = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return applyRules(DEFAULT_HTML, DEFAULT_RULES).html;
  }, []);

  const combinedDiagnostics = useMemo(
    () => [...state.validationDiagnostics, ...state.rewriteDiagnostics],
    [state.validationDiagnostics, state.rewriteDiagnostics],
  );

  useEffect(() => {
    setPersistedRules(state.draftRules);
  }, [setPersistedRules, state.draftRules]);

  useEffect(() => {
    setPersistedHtml(state.draftHtml);
  }, [setPersistedHtml, state.draftHtml]);

  useEffect(() => {
    const { rules, diagnostics } = parseRules(state.draftRules);
    dispatch({ type: 'setValidation', rules, diagnostics });
  }, [state.draftRules]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (rewriteTimerRef.current) {
      window.clearTimeout(rewriteTimerRef.current);
    }

    rewriteTimerRef.current = window.setTimeout(() => {
      const { html: resultHtml, diagnostics } = applyRules(
        state.draftHtml,
        state.validatedRules,
      );
      dispatch({ type: 'setRewrite', resultHtml, diagnostics });
    }, 120);

    return () => {
      if (rewriteTimerRef.current) {
        window.clearTimeout(rewriteTimerRef.current);
      }
    };
  }, [state.draftHtml, state.validatedRules]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof Worker !== 'function') return undefined;

    diffWorkerRef.current = new Worker(new URL('./worker.ts', import.meta.url));
    diffWorkerRef.current.onmessage = (event: MessageEvent<any>) => {
      if (event.data?.type !== 'diff') return;
      if (event.data.id !== diffJobRef.current) return;
      dispatch({ type: 'setDiff', diff: event.data.diff as DiffChunk[] });
    };

    return () => {
      diffWorkerRef.current?.terminate();
      diffWorkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (diffTimerRef.current) {
      window.clearTimeout(diffTimerRef.current);
    }

    diffTimerRef.current = window.setTimeout(() => {
      if (!diffWorkerRef.current) {
        dispatch({
          type: 'setDiff',
          diff: diffLines(state.draftHtml, state.resultHtml) as DiffChunk[],
        });
        return;
      }

      diffJobRef.current += 1;
      diffWorkerRef.current.postMessage({
        type: 'diff',
        id: diffJobRef.current,
        original: state.draftHtml,
        updated: state.resultHtml,
      });
    }, 120);

    return () => {
      if (diffTimerRef.current) {
        window.clearTimeout(diffTimerRef.current);
      }
    };
  }, [state.draftHtml, state.resultHtml]);

  useEffect(() => {
    if (!showHelp) return undefined;

    const modal = modalRef.current;
    const trigger = helpTriggerRef.current;
    if (!modal) return undefined;

    const focusable = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('disabled'));

    const first = focusable[0] ?? modal;
    const last = focusable[focusable.length - 1] ?? modal;

    first.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowHelp(false);
        return;
      }

      if (event.key !== 'Tab') return;
      if (focusable.length === 0) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [showHelp]);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current) {
        window.clearTimeout(announceTimerRef.current);
      }
    };
  }, []);

  const updateAnnouncement = useCallback((message: string) => {
    setAnnounce(message);
    if (announceTimerRef.current) {
      window.clearTimeout(announceTimerRef.current);
    }
    announceTimerRef.current = window.setTimeout(() => setAnnounce(''), 2000);
  }, []);

  const handleCopyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.resultHtml);
      updateAnnouncement('Rewritten HTML copied to clipboard.');
    } catch {
      updateAnnouncement('Unable to copy output.');
    }
  }, [state.resultHtml, updateAnnouncement]);

  const handleDownload = useCallback((
    filename: string,
    contents: string,
    type = 'text/plain',
  ) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    updateAnnouncement(`${filename} downloaded.`);
  }, [updateAnnouncement]);

  const handleHelpTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = HELP_TABS.findIndex(
        (tab) => tab.id === activeHelpTab,
      );

      if (currentIndex === -1) return;

      const moveFocus = (nextIndex: number) => {
        const nextTab = HELP_TABS[nextIndex];
        if (!nextTab) return;
        setActiveHelpTab(nextTab.id);
        requestAnimationFrame(() => helpTabRefs.current[nextIndex]?.focus());
      };

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveFocus((currentIndex + 1) % HELP_TABS.length);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus((currentIndex - 1 + HELP_TABS.length) % HELP_TABS.length);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        moveFocus(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        moveFocus(HELP_TABS.length - 1);
      }
    },
    [activeHelpTab],
  );

  const handleResultTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = RESULT_TABS.findIndex(
        (tab) => tab.id === activeResultTab,
      );

      if (currentIndex === -1) return;

      const moveFocus = (nextIndex: number) => {
        const nextTab = RESULT_TABS[nextIndex];
        if (!nextTab) return;
        setActiveResultTab(nextTab.id);
        requestAnimationFrame(() => resultTabRefs.current[nextIndex]?.focus());
      };

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveFocus((currentIndex + 1) % RESULT_TABS.length);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus((currentIndex - 1 + RESULT_TABS.length) % RESULT_TABS.length);
      }

      if (event.key === 'Home') {
        event.preventDefault();
        moveFocus(0);
      }

      if (event.key === 'End') {
        event.preventDefault();
        moveFocus(RESULT_TABS.length - 1);
      }
    },
    [activeResultTab],
  );

  const handlePreset = useCallback((preset: Preset) => {
    dispatch({ type: 'setDraftRules', value: serialize(preset.rules) });
    dispatch({ type: 'setDraftHtml', value: preset.html });
    setActiveResultTab('output');
  }, []);

  return (
    <div className="h-full w-full overflow-auto bg-[var(--kali-bg)] p-6 text-[var(--kali-text)] space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">HTML Rewriter</h1>
          <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,transparent)] max-w-3xl">
            Transform markup with CSS selectors and structured rule actions. Edit the rule JSON and
            watch the rewritten output update instantly.
          </p>
        </div>
        <button
          type="button"
          ref={helpTriggerRef}
          className={`ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-xl text-[color:var(--color-ubt-blue)] transition hover:bg-[color:color-mix(in_srgb,_var(--kali-panel)_88%,_var(--color-ubt-blue)_12%)] focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses}`}
          aria-label="Open rewrite help"
          title="Open rewrite help"
          onClick={() => {
            setActiveHelpTab('selectors');
            setShowHelp(true);
          }}
        >
          <span aria-hidden="true">❓</span>
        </button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      <section className="space-y-4 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-[color:var(--kali-text)]">Quick start</h2>
        <p className="text-sm text-gray-300 max-w-3xl">
          Try the default rules below to remove inline scripts and overwrite headings before
          experimenting with your own selectors.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Rules</h3>
            <pre
              tabIndex={0}
              className={`mt-2 whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
            >
              {serialize(DEFAULT_RULES)}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Original HTML</h3>
            <pre
              tabIndex={0}
              className={`mt-2 whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
            >
              {DEFAULT_HTML}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">Rewritten HTML</h3>
            <pre
              tabIndex={0}
              className={`mt-2 whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
            >
              {quickStartOutput}
            </pre>
          </div>
        </div>
      </section>
      <section className="space-y-3 rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Presets</h2>
            <p className="text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,transparent)]">
              Load a full ruleset and HTML sample with one click.
            </p>
          </div>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_60%,transparent)]">
            {state.validatedRules.length} validated rule{state.validatedRules.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`w-full rounded-md border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_94%,_transparent)] p-4 text-left transition hover:border-[color:color-mix(in_srgb,_var(--color-ubt-blue)_35%,_var(--kali-border)_65%)] hover:bg-[color:color-mix(in_srgb,_var(--kali-panel)_88%,_var(--color-ubt-blue)_12%)] focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses}`}
              onClick={() => handlePreset(preset)}
              aria-label={`Apply preset ${preset.name}`}
            >
              <div className="text-sm font-semibold text-gray-100">{preset.name}</div>
              <div className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,transparent)]">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <details className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-100">
            Remove elements
          </summary>
          <div className="mt-2 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent)]">
            <p>
              Use the{' '}
              <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                remove
              </code>{' '}
              action to strip matching nodes from the document entirely.
            </p>
            <pre
              tabIndex={0}
              className={`whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
            >
              {`{
  "selector": "script",
  "action": "remove"
}`}
            </pre>
          </div>
        </details>
        <details className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow">
          <summary className="cursor-pointer text-sm font-semibold text-gray-100">
            Replace text content
          </summary>
          <div className="mt-2 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent)]">
            <p>
              Swap the text content of the selected elements by providing a{' '}
              <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                value
              </code>{' '}
              alongside the{' '}
              <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                replaceText
              </code>{' '}
              action.
            </p>
            <pre
              tabIndex={0}
              className={`whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
            >
              {`{
  "selector": "h1",
  "action": "replaceText",
  "value": "Rewritten Title"
}`}
            </pre>
          </div>
        </details>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow-lg">
          <label className="mb-2 text-sm font-semibold text-gray-200" htmlFor="html-rewriter-rules">
            Rewrite Rules (JSON)
          </label>
          <textarea
            id="html-rewriter-rules"
            className={`flex-1 resize-y rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 font-mono text-sm text-[color:var(--kali-text)] shadow-inner focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses}`}
            value={state.draftRules}
            onChange={(e) =>
              dispatch({ type: 'setDraftRules', value: e.target.value })
            }
            aria-label="Rewrite rules in JSON"
          />
          {combinedDiagnostics.length > 0 && (
            <div className="mt-3 rounded-md border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_90%,_transparent)] p-3 text-sm text-red-200">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-300">
                Diagnostics
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {combinedDiagnostics.map((diagnostic) => (
                  <li key={diagnostic.id}>
                    {diagnostic.ruleIndex !== undefined
                      ? `Rule ${diagnostic.ruleIndex + 1}: `
                      : ''}
                    {diagnostic.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex flex-col rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow-lg">
          <label className="mb-2 text-sm font-semibold text-gray-200" htmlFor="html-rewriter-sample">
            Sample HTML
          </label>
          <textarea
            id="html-rewriter-sample"
            className={`flex-1 resize-y rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 font-mono text-sm text-[color:var(--kali-text)] shadow-inner focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses}`}
            value={state.draftHtml}
            onChange={(e) =>
              dispatch({ type: 'setDraftHtml', value: e.target.value })
            }
            aria-label="Sample HTML"
          />
        </div>
      </div>
      <section className="space-y-3 rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Output</h2>
            <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_65%,transparent)]">
              Live rewritten markup, diff view, and safe preview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryActionButton}
              onClick={handleCopyOutput}
              aria-label="Copy rewritten HTML"
            >
              Copy Output
            </button>
            <button
              type="button"
              className={secondaryActionButton}
              onClick={() =>
                handleDownload('rewritten.html', state.resultHtml, 'text/html')
              }
              aria-label="Download rewritten HTML"
            >
              Download HTML
            </button>
            <button
              type="button"
              className={secondaryActionButton}
              onClick={() =>
                handleDownload('rewrite-rules.json', state.draftRules, 'application/json')
              }
              aria-label="Download rewrite rules"
            >
              Download Rules
            </button>
          </div>
        </div>
        <div
          role="tablist"
          aria-label="Output views"
          className="flex flex-wrap gap-2"
          onKeyDown={handleResultTabKeyDown}
        >
          {RESULT_TABS.map((tab, index) => {
            const tabButtonId = `html-rewriter-output-tab-${tab.id}`;
            const tabPanelId = `html-rewriter-output-panel-${tab.id}`;
            const isActive = activeResultTab === tab.id;
            return (
              <button
                key={tab.id}
                id={tabButtonId}
                role="tab"
                aria-controls={tabPanelId}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                ref={(node) => {
                  resultTabRefs.current[index] = node;
                }}
                className={`rounded border px-4 py-2 text-sm transition focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses} ${
                  isActive
                    ? 'border-[color:color-mix(in_srgb,_var(--color-ubt-blue)_55%,_var(--kali-border)_45%)] bg-[color:color-mix(in_srgb,_var(--color-ubt-blue)_28%,_var(--kali-panel)_72%)] text-[color:var(--kali-text)] shadow-[0_0_0_1px_color-mix(in_srgb,_var(--color-ubt-blue)_45%,_transparent)]'
                    : 'border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_94%,_transparent)] text-gray-200 hover:border-[color:color-mix(in_srgb,_var(--color-ubt-blue)_35%,_var(--kali-border)_65%)] hover:bg-[color:color-mix(in_srgb,_var(--kali-panel)_88%,_var(--color-ubt-blue)_12%)]'
                }`}
                onClick={() => setActiveResultTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div
          className="rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 shadow-inner"
          role="tabpanel"
          id={`html-rewriter-output-panel-${activeResultTab}`}
          aria-labelledby={`html-rewriter-output-tab-${activeResultTab}`}
          tabIndex={0}
        >
          {activeResultTab === 'output' && (
            <pre
              className={`whitespace-pre-wrap text-sm text-[color:var(--kali-text)] ${focusRingClasses}`}
            >
              {state.resultHtml}
            </pre>
          )}
          {activeResultTab === 'diff' && (
            <pre
              className={`whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--kali-text)] ${focusRingClasses}`}
            >
              {state.diff.map((part: Change, index: number) => (
                <span
                  key={`${index}-${part.value}`}
                  className={
                    part.added
                      ? 'rounded-sm bg-kali-severity-low/20 px-1 text-kali-severity-low'
                      : part.removed
                        ? 'rounded-sm bg-kali-severity-high/15 px-1 text-kali-severity-high line-through'
                        : 'text-[color:color-mix(in_srgb,var(--kali-terminal-text)_80%,transparent)]'
                  }
                >
                  {part.value}
                </span>
              ))}
            </pre>
          )}
          {activeResultTab === 'preview' && (
            <div className="space-y-2">
              <p className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,transparent)]">
                Preview runs in a sandboxed iframe with scripts disabled.
              </p>
              <iframe
                title="Safe preview"
                sandbox="allow-same-origin"
                srcDoc={state.resultHtml}
                className="h-72 w-full rounded border border-[color:var(--kali-border)] bg-white"
              />
            </div>
          )}
        </div>
      </section>
      {showHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,15,23,0.88)] p-4"
          role="presentation"
          onClick={() => setShowHelp(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={modalDescriptionId}
            className="relative w-full max-w-2xl space-y-4 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-6 text-left text-[color:var(--kali-text)] shadow-xl"
            onClick={(event) => event.stopPropagation()}
            ref={modalRef}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={modalTitleId}
                  className="text-xl font-semibold text-[color:var(--kali-terminal-text)]"
                >
                  HTML Rewriter help
                </h2>
                <p
                  id={modalDescriptionId}
                  className="text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,transparent)]"
                >
                  Learn which selectors and actions are supported, plus copy a ready-to-use rule set.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close help"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-lg text-[color:var(--kali-text)] transition hover:bg-[color:color-mix(in_srgb,_var(--kali-panel)_85%,_var(--color-ubt-blue)_15%)] focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses}`}
                onClick={() => setShowHelp(false)}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <div
              role="tablist"
              aria-label="Help topics"
              className="flex flex-wrap gap-2"
              onKeyDown={handleHelpTabKeyDown}
            >
              {HELP_TABS.map((tab, index) => {
                const tabButtonId = `html-rewriter-help-tab-${tab.id}`;
                const tabPanelId = `html-rewriter-help-panel-${tab.id}`;
                const isActive = activeHelpTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={tabButtonId}
                    role="tab"
                    aria-controls={tabPanelId}
                    aria-selected={isActive}
                    tabIndex={isActive ? 0 : -1}
                    ref={(node) => {
                      helpTabRefs.current[index] = node;
                    }}
                    className={`rounded border px-4 py-2 text-sm transition focus-visible:border-[color:var(--color-focus-ring)] ${focusRingClasses} ${
                      isActive
                        ? 'border-[color:color-mix(in_srgb,_var(--color-ubt-blue)_55%,_var(--kali-border)_45%)] bg-[color:color-mix(in_srgb,_var(--color-ubt-blue)_28%,_var(--kali-panel)_72%)] text-[color:var(--kali-text)] shadow-[0_0_0_1px_color-mix(in_srgb,_var(--color-ubt-blue)_45%,_transparent)]'
                        : 'border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_94%,_transparent)] text-gray-200 hover:border-[color:color-mix(in_srgb,_var(--color-ubt-blue)_35%,_var(--kali-border)_65%)] hover:bg-[color:color-mix(in_srgb,_var(--kali-panel)_88%,_var(--color-ubt-blue)_12%)]'
                    }`}
                    onClick={() => setActiveHelpTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div
              className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,_var(--kali-panel)_92%,_transparent)] p-4 shadow-inner"
              role="tabpanel"
              id={`html-rewriter-help-panel-${activeHelpTab}`}
              aria-labelledby={`html-rewriter-help-tab-${activeHelpTab}`}
            >
              {activeHelpTab === 'selectors' && (
                <div className="space-y-2 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent)]">
                  <p>
                    Target elements with any valid CSS selector. Combine class, id, or attribute
                    selectors to focus the rewrite.
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                        p
                      </code>{' '}
                      selects every paragraph element.
                    </li>
                    <li>
                      <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                        main {'>'} h2
                      </code>{' '}
                      scopes to headings in the main area.
                    </li>
                    <li>
                      <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                        [data-track=&quot;outbound&quot;]
                      </code>{' '}
                      matches links tagged for tracking.
                    </li>
                  </ul>
                </div>
              )}
              {activeHelpTab === 'actions' && (
                <div className="space-y-3 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent)]">
                  <div>
                    <h3 className="text-base font-semibold text-[color:var(--kali-text)]">
                      remove
                    </h3>
                    <p>Delete the matched node entirely. Useful for scripts, ads, or banners.</p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[color:var(--kali-text)]">
                      replaceText
                    </h3>
                    <p>
                      Swap the text content of the target. Provide a{' '}
                      <code className="rounded bg-[color:var(--kali-panel-highlight)] px-1 py-0.5 text-[color:var(--kali-text)]">
                        value
                      </code>{' '}
                      string to use as the replacement.
                    </p>
                  </div>
                </div>
              )}
              {activeHelpTab === 'payloads' && (
                <div className="space-y-3 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent)]">
                  <p>Copy these starter rules to clean risky markup and annotate media placeholders.</p>
                  <pre
                    tabIndex={0}
                    className={`whitespace-pre-wrap rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-xs text-[color:var(--kali-text)] shadow-inner ${focusRingClasses}`}
                  >
                    {SAMPLE_PAYLOAD}
                  </pre>
                  <p>
                    Paste the JSON into the rule editor and adjust selectors or values to match your
                    source HTML.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlRewriterApp;
