import Head from 'next/head';
import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/screen/navbar';
import BackgroundImage from '../../components/util-components/background-image';
import CopyButton from '../../components/util-components/CopyButton';
import { DesignTokenProvider, useDesignTokens } from '../../data/design-system/DesignTokenContext';
import {
  buildDesignIndex,
  clearDesignIndex,
  searchDesign,
  type DesignSearchDocument,
} from '../../utils/search/designIndex';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/useSettings';
import { THEME_UNLOCKS } from '../../utils/theme';
import type { TokenValue } from '../../data/design-system/tokens';
import '../../styles/design-system.css';

const shellSnippet = `import Navbar from '@/components/screen/navbar';
import BackgroundImage from '@/components/util-components/background-image';

export function DesignShell({ children }) {
  return (
    <div className="relative min-h-screen bg-ub-grey text-ubt-grey">
      <BackgroundImage />
      <Navbar />
      <main className="relative z-10 pt-14 pb-10">{children}</main>
    </div>
  );
}`;

const layoutSnippet = `export const Panel = ({ title, children }) => (
  <section className="rounded-xl border border-ub-border-orange/40 bg-ub-lite-abrgn/70 p-6">
    <header className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ubt-grey">{title}</h2>
    </header>
    <div className="space-y-4 text-ubt-grey/90">{children}</div>
  </section>
);`;

const motionSnippet = `button {
  transition: transform var(--motion-fast) ease, box-shadow var(--motion-medium) ease;
}

button:focus-visible {
  transition-duration: var(--motion-fast);
}

@media (prefers-reduced-motion: reduce) {
  button {
    transition-duration: 0ms;
  }
}`;

const toneSnippet = `// Voice checklist
- Lead with actions users can take.
- Prefer security education over fear.
- Explain acronyms on first use.
- Highlight keyboard support with the key name wrapped in <kbd> tags.`;

type SectionConfig = {
  id: string;
  title: string;
  description: string;
  render: React.ReactNode;
  doc: DesignSearchDocument;
};

type TokenGroup = {
  heading: string;
  tokens: TokenValue[];
};

const themeOptions = Object.keys(THEME_UNLOCKS);

const toSearchableText = (groups: TokenGroup[]): string =>
  groups
    .map((group) =>
      `${group.heading} ${group.tokens
        .map((token) => `${token.label} ${token.name} ${token.value}`)
        .join(' ')}`,
    )
    .join(' ');

const getContrastColor = (value: string): string => {
  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  let r: number;
  let g: number;
  let b: number;
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map((part) => part.trim())
      .map(Number);
    [r, g, b] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  } else if (value.startsWith('#')) {
    const hex = value.replace('#', '');
    const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const int = Number.parseInt(normalized.padEnd(6, '0').slice(0, 6), 16);
    r = (int >> 16) & 255;
    g = (int >> 8) & 255;
    b = int & 255;
  } else {
    return '#ffffff';
  }
  const [nr, ng, nb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
  return luminance > 0.55 ? '#0f1317' : '#ffffff';
};

const formatPx = (valuePx?: number): string | undefined => {
  if (!valuePx || Number.isNaN(valuePx)) return undefined;
  return `${Math.round(valuePx)}px`;
};

const TokensSection = () => {
  const { colors, spacing, typography, radius } = useDesignTokens();

  return (
    <section id="tokens" className="design-card">
      <h2 className="design-section-title">
        <span className="text-3xl">🎨</span>
        Tokens
      </h2>
      <div className="design-section-body">
        <p>
          Tokens are read live from the active theme so previews stay in sync with runtime values. Use the copy
          controls to grab CSS variables without leaving the page.
        </p>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-ubt-grey">Color</h3>
            <div className="design-token-grid">
              {colors.map((token) => {
                const textColor = getContrastColor(token.value);
                return (
                  <div key={token.name} className="design-token-swatch" style={{ backgroundColor: token.value, color: textColor }}>
                    <CopyButton value={`var(${token.cssVar})`} className="design-token-copy" />
                    <div className="design-token-meta">
                      <p className="text-base font-semibold normal-case">{token.label}</p>
                      <p className="font-mono text-xs lowercase">{token.value}</p>
                      <p className="font-mono text-xs lowercase text-ubt-grey/70">{token.cssVar}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ubt-grey">Spacing scale</h3>
            <div className="design-spacing-grid">
              {spacing.map((token) => {
                const px = formatPx(token.valuePx);
                const width = Math.max(12, Math.min(240, (token.valuePx ?? 16) * 3));
                return (
                  <div key={token.name} className="design-spacing-row">
                    <div>
                      <p className="font-semibold text-ubt-grey">{token.label}</p>
                      <p className="text-xs text-ubt-grey/70">{token.description}</p>
                      <div className="mt-2 flex items-center gap-2 font-mono text-xs text-ubt-grey/80">
                        <span>{token.value}</span>
                        {px && <span>({px})</span>}
                        <CopyButton value={`var(${token.cssVar})`} className="design-inline-copy" />
                      </div>
                    </div>
                    <div className="design-spacing-visual">
                      <div className="design-spacing-bar" style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ubt-grey">Typography & focus</h3>
            <div className="design-typography-list">
              {typography.map((token) => (
                <div key={token.name} className="design-typography-item">
                  <p className="font-semibold text-ubt-grey">{token.label}</p>
                  <p className="font-mono text-sm text-ubt-grey/80">{token.value}</p>
                  <CopyButton value={`var(${token.cssVar})`} className="design-inline-copy" />
                  {token.description && <p className="text-xs text-ubt-grey/70">{token.description}</p>}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ubt-grey">Radii</h3>
            <div className="design-typography-list">
              {radius.map((token) => (
                <div key={token.name} className="design-typography-item">
                  <p className="font-semibold text-ubt-grey">{token.label}</p>
                  <p className="font-mono text-sm text-ubt-grey/80">{token.value}</p>
                  <CopyButton value={`var(${token.cssVar})`} className="design-inline-copy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ComponentsSection = () => (
  <section id="components" className="design-card">
    <h2 className="design-section-title">
      <span className="text-3xl">🧩</span>
      Components
    </h2>
    <div className="design-section-body">
      <p>
        Reuse the Ubuntu shell pieces instead of duplicating chrome. The design system page itself mounts the shared{' '}
        <code className="design-badge">Navbar</code> and <code className="design-badge">BackgroundImage</code> from the
        desktop experience so new surfaces feel native.
      </p>
      <div className="design-code-block">
        <CopyButton value={shellSnippet} className="design-token-copy" />
        <pre>
          <code>{shellSnippet}</code>
        </pre>
      </div>
      <ul className="design-list">
        <li>
          Use the <code className="design-badge">SettingsProvider</code> and <code className="design-badge">useTheme</code>{' '}
          hooks to stay in sync with personalization controls.
        </li>
        <li>
          Windows, menus, and the dock ship from <code className="design-badge">components/screen</code>; wire new views as
          focused content areas within that frame.
        </li>
        <li>
          Keep utility widgets under <code className="design-badge">components/util-components</code> so icons and copy
          buttons remain consistent.
        </li>
      </ul>
    </div>
  </section>
);

const LayoutSection = () => (
  <section id="layout" className="design-card">
    <h2 className="design-section-title">
      <span className="text-3xl">📐</span>
      Layout
    </h2>
    <div className="design-section-body">
      <p>
        Align experiences with the responsive desktop grid: 12-column on wide screens, stacked on mobile. The shared spacing
        tokens guarantee comfortable density that still respects compact mode.
      </p>
      <div className="design-code-block">
        <CopyButton value={layoutSnippet} className="design-token-copy" />
        <pre>
          <code>{layoutSnippet}</code>
        </pre>
      </div>
      <ul className="design-list">
        <li>Use <code className="design-badge">max-w-6xl</code> containers to keep lines readable on ultrawide monitors.</li>
        <li>
          Apply <code className="design-badge">gap-[var(--space-X)]</code> utilities instead of hard-coded pixels so density
          toggles propagate everywhere.
        </li>
        <li>
          Leverage the radius tokens for cards, panels, and chips; <code className="design-badge">radius-lg</code> pairs with
          the window aesthetic.
        </li>
      </ul>
    </div>
  </section>
);

const MotionSection = () => {
  const { motion } = useDesignTokens();
  return (
    <section id="motion" className="design-card">
      <h2 className="design-section-title">
        <span className="text-3xl">🎞️</span>
        Motion
      </h2>
      <div className="design-section-body">
        <p>
          Motion tokens bias toward subtlety. Respect reduced-motion preferences automatically by reading values from the
          token provider.
        </p>
        <div className="design-typography-list">
          {motion.map((token) => (
            <div key={token.name} className="design-typography-item">
              <p className="font-semibold text-ubt-grey">{token.label}</p>
              <p className="font-mono text-sm text-ubt-grey/80">{token.value}</p>
              <CopyButton value={`var(${token.cssVar})`} className="design-inline-copy" />
            </div>
          ))}
        </div>
        <div className="design-code-block">
          <CopyButton value={motionSnippet} className="design-token-copy" />
          <pre>
            <code>{motionSnippet}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};

const AccessibilitySection = () => (
  <section id="accessibility" className="design-card">
    <h2 className="design-section-title">
      <span className="text-3xl">♿</span>
      Accessibility
    </h2>
    <div className="design-section-body">
      <ul className="design-list">
        <li>
          Honor <code className="design-badge">reduced-motion</code>, <code className="design-badge">high-contrast</code>,
          and <code className="design-badge">large-hit-area</code> modes exposed in user settings.
        </li>
        <li>Focus indicators should use <code className="design-badge">var(--focus-outline-color)</code>.</li>
        <li>
          Every window, menu, and app tile must remain reachable via keyboard and announce state changes with the live region in
          <code className="design-badge">_app.jsx</code>.
        </li>
        <li>
          Prefer semantic HTML and ARIA labels that match the Ubuntu desktop vocabulary—"dock", "workspace switcher", and so on.
        </li>
      </ul>
      <CopyButton value="var(--focus-outline-color)" label="Copy focus color" />
    </div>
  </section>
);

const ContentSection = () => (
  <section id="content" className="design-card">
    <h2 className="design-section-title">
      <span className="text-3xl">📝</span>
      Content
    </h2>
    <div className="design-section-body">
      <p>
        Voice balances Kali&apos;s security roots with Ubuntu&apos;s friendliness. Keep copy actionable, welcoming, and free from fear
        marketing.
      </p>
      <div className="design-code-block">
        <CopyButton value={toneSnippet} className="design-token-copy" />
        <pre>
          <code>{toneSnippet}</code>
        </pre>
      </div>
      <ul className="design-list">
        <li>Lead with verbs that describe what the user can do next.</li>
        <li>Frame security warnings as guidance, not alarms.</li>
        <li>Pair hacker terminology with short explanations for newcomers.</li>
        <li>Highlight accessibility affordances such as keyboard shortcuts or caption toggles.</li>
      </ul>
    </div>
  </section>
);

const ControlsPanel = () => {
  const { theme, setTheme } = useTheme();
  const { density, setDensity, reducedMotion, setReducedMotion, highContrast, setHighContrast } = useSettings();

  return (
    <section className="design-card">
      <h2 className="design-section-title">
        <span className="text-3xl">🧭</span>
        Preview controls
      </h2>
      <div className="design-section-body">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ubt-grey">Theme</span>
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
              className="rounded-lg border border-ub-border-orange/40 bg-ub-drk-abrgn/60 px-3 py-2 text-ubt-grey focus:outline-none focus:ring-2 focus:ring-ub-border-orange"
            >
              {themeOptions.map((option) => (
                <option key={option} value={option} className="bg-ub-drk-abrgn text-ubt-grey">
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ubt-grey">Density</span>
            <div className="flex gap-3">
              {(['regular', 'compact'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDensity(option)}
                  className={`design-copy-trigger ${density === option ? 'bg-ub-border-orange/60 text-black' : ''}`.trim()}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`design-copy-trigger ${reducedMotion ? 'bg-ub-border-orange/60 text-black' : ''}`.trim()}
          >
            {reducedMotion ? 'Reduced motion: on' : 'Reduced motion: off'}
          </button>
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={`design-copy-trigger ${highContrast ? 'bg-ub-border-orange/60 text-black' : ''}`.trim()}
          >
            {highContrast ? 'High contrast: on' : 'High contrast: off'}
          </button>
        </div>
      </div>
    </section>
  );
};

const DesignSystemContent = () => {
  const tokens = useDesignTokens();
  const [query, setQuery] = useState('');

  const groups: TokenGroup[] = useMemo(
    () => [
      { heading: 'Color', tokens: tokens.colors },
      { heading: 'Spacing', tokens: tokens.spacing },
      { heading: 'Typography', tokens: tokens.typography },
      { heading: 'Radius', tokens: tokens.radius },
      { heading: 'Motion', tokens: tokens.motion },
    ],
    [tokens],
  );

  const docs = useMemo<SectionConfig[]>(() => {
    const tokensDoc: SectionConfig = {
      id: 'tokens',
      title: 'Tokens',
      description: 'Live color, spacing, and typography tokens pulled from the theme runtime.',
      render: <TokensSection />, // tokens read from context internally
      doc: {
        id: 'tokens',
        title: 'Tokens',
        section: 'Tokens',
        body: toSearchableText(groups),
        keywords: ['color', 'spacing', 'typography', 'radius', 'token'],
      },
    };

    const other: SectionConfig[] = [
      {
        id: 'components',
        title: 'Components',
        description: 'Shell components shared with the desktop environment.',
        render: <ComponentsSection />,
        doc: {
          id: 'components',
          title: 'Components',
          section: 'Components',
          body: 'Ubuntu shell reuse background image navbar settings provider util components copy button',
          keywords: ['navbar', 'background', 'shell', 'window', 'provider'],
        },
      },
      {
        id: 'layout',
        title: 'Layout',
        description: 'Grid, spacing, and responsive guidance.',
        render: <LayoutSection />,
        doc: {
          id: 'layout',
          title: 'Layout',
          section: 'Layout',
          body: 'responsive grid max width spacing tokens radius utilities cards panels',
          keywords: ['grid', 'panel', 'spacing', 'radius'],
        },
      },
      {
        id: 'motion',
        title: 'Motion',
        description: 'Timing tokens and reduced motion fallbacks.',
        render: <MotionSection />,
        doc: {
          id: 'motion',
          title: 'Motion',
          section: 'Motion',
          body: `${tokens.motion.map((token) => `${token.name} ${token.value}`).join(' ')} animations transitions reduced motion`,
          keywords: ['motion', 'animation', 'transition'],
        },
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        description: 'Keyboard, focus, and personalization guidelines.',
        render: <AccessibilitySection />,
        doc: {
          id: 'accessibility',
          title: 'Accessibility',
          section: 'Accessibility',
          body: 'focus outline color live region keyboard reduced motion high contrast large hit areas',
          keywords: ['focus', 'keyboard', 'a11y'],
        },
      },
      {
        id: 'content',
        title: 'Content',
        description: 'Voice and tone reminders.',
        render: <ContentSection />,
        doc: {
          id: 'content',
          title: 'Content',
          section: 'Content',
          body: 'voice tone actionable guidance explain acronyms accessibility copywriting',
          keywords: ['tone', 'voice', 'copy'],
        },
      },
    ];

    return [tokensDoc, ...other];
  }, [groups, tokens.motion]);

  const documents = useMemo(() => docs.map((section) => section.doc), [docs]);

  useEffect(() => {
    clearDesignIndex();
    buildDesignIndex(documents);
    return () => clearDesignIndex();
  }, [documents]);

  const sections = useMemo(() => {
    if (!query.trim()) return docs;
    const results = searchDesign(query.trim());
    const ids = new Set(results.map((result) => result.id));
    return docs.filter((section) => ids.has(section.id));
  }, [docs, query]);

  return (
    <>
      <section className="design-card">
        <h2 className="design-section-title">
          <span className="text-3xl">🔍</span>
          Search the system
        </h2>
        <div className="design-section-body">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tokens, motion, accessibility, and more"
            className="design-search"
          />
        </div>
      </section>
      <ControlsPanel />
      {sections.length ? (
        sections.map((section) => <React.Fragment key={section.id}>{section.render}</React.Fragment>)
      ) : (
        <div className="design-no-results">No sections matched your search. Try a different keyword.</div>
      )}
    </>
  );
};

const DesignSystemPage = () => (
  <DesignTokenProvider>
    <div className="design-page">
      <Head>
        <title>Kali Linux Portfolio — Design System</title>
        <meta
          name="description"
          content="Design tokens, layout primitives, and accessibility guidelines for the Kali Linux portfolio shell."
        />
      </Head>
      <div className="design-shell-background">
        <BackgroundImage />
      </div>
      <div className="design-shell-navbar">
        <Navbar />
      </div>
      <main className="design-container">
        <header className="design-card">
          <h1 className="design-section-title">
            <span className="text-3xl">🛠️</span>
            Kali Design System
          </h1>
          <p className="design-section-body">
            A reference workstation for contributors. Preview live tokens, copy shell scaffolds, and ship features that inherit
            personalization settings without any network calls.
          </p>
        </header>
        <DesignSystemContent />
      </main>
    </div>
  </DesignTokenProvider>
);

export default DesignSystemPage;
