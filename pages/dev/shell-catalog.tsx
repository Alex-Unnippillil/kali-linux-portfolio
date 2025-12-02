import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import type { CSSProperties, ReactNode } from 'react';

const DEV_FLAG = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEV_SHELL_CATALOG === 'true';
const DOC_URL = 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/shell-catalog.md';

type ThemeMode = 'light' | 'dark';
type DensityMode = 'compact' | 'comfortable' | 'spacious';

interface ShellRenderProps {
  theme: ThemeMode;
  density: DensityMode;
}

interface ShellVariant {
  id: string;
  title: string;
  description: string;
  render: (props: ShellRenderProps) => ReactNode;
}

const palette = {
  light: {
    frame: 'border border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-900/5',
    frameMuted: 'bg-slate-100',
    header: 'border-b border-slate-200 bg-slate-50/90 backdrop-blur',
    metric: 'border border-slate-200 bg-slate-50/95',
    code: 'border border-slate-900/10 bg-slate-900 text-sky-100',
    codeAlt: 'border border-slate-200 bg-white',
    timeline: 'border-l border-slate-200',
    textSubtle: 'text-slate-600',
    accentSoft: 'bg-sky-100 text-sky-700',
    accentBorder: 'border border-sky-200',
  },
  dark: {
    frame: 'border border-slate-700 bg-slate-900/80 text-slate-100 shadow-lg shadow-black/30',
    frameMuted: 'bg-slate-900/60',
    header: 'border-b border-slate-700 bg-slate-800/70 backdrop-blur',
    metric: 'border border-slate-700/80 bg-slate-800/70',
    code: 'border border-slate-800/80 bg-slate-950/80 text-sky-200',
    codeAlt: 'border border-slate-700/70 bg-slate-900/80',
    timeline: 'border-l border-slate-700/80',
    textSubtle: 'text-slate-400',
    accentSoft: 'bg-sky-500/20 text-sky-200',
    accentBorder: 'border border-sky-500/40',
  },
} satisfies Record<ThemeMode, Record<string, string>>;

const densityScale = {
  compact: {
    text: 'text-xs',
    headerPad: 'px-3 py-2',
    contentPad: 'p-3',
    gap: 'gap-2',
    itemPad: 'px-3 py-1.5',
    badge: 'px-1.5 py-0.5 text-[10px]',
    grid: 20,
  },
  comfortable: {
    text: 'text-sm',
    headerPad: 'px-4 py-2.5',
    contentPad: 'p-4',
    gap: 'gap-3',
    itemPad: 'px-4 py-2',
    badge: 'px-2 py-0.5 text-xs',
    grid: 24,
  },
  spacious: {
    text: 'text-base',
    headerPad: 'px-5 py-3',
    contentPad: 'p-5',
    gap: 'gap-4',
    itemPad: 'px-5 py-3',
    badge: 'px-3 py-1 text-sm',
    grid: 28,
  },
} satisfies Record<DensityMode, {
  text: string;
  headerPad: string;
  contentPad: string;
  gap: string;
  itemPad: string;
  badge: string;
  grid: number;
}>;

const densityOptions: { id: DensityMode; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'spacious', label: 'Spacious' },
];

function useDevRouteGuard() {
  const router = useRouter();

  useEffect(() => {
    if (!DEV_FLAG) {
      const id = window.setTimeout(() => {
        void router.replace('/404');
      }, 300);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [router]);
}

const GuardMessage = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Shell catalog is disabled</h1>
      <p className="text-sm text-slate-300">
        This route is reserved for local development. Run <code className="rounded bg-slate-900 px-2 py-1">yarn dev</code> or set
        {' '}
        <code className="rounded bg-slate-900 px-2 py-1">NEXT_PUBLIC_ENABLE_DEV_SHELL_CATALOG=true</code>
        {' '}in your environment to opt-in on a preview deployment.
      </p>
      <p className="text-sm text-slate-400">
        See the{' '}
        <Link href={DOC_URL} className="underline" target="_blank" rel="noreferrer">
          Shell catalog guide
        </Link>{' '}
        for more details.
      </p>
    </div>
  </div>
);

const WorkspacePreview = ({ theme, density }: ShellRenderProps) => {
  const tone = palette[theme];
  const scale = densityScale[density];
  const rightBorderColor = theme === 'light' ? 'md:border-slate-200' : 'md:border-slate-700';

  const metricCard = (title: string, value: string, trend: string) => (
    <div className={`rounded-xl ${tone.metric} ${scale.itemPad} flex flex-col gap-1`}
      aria-label={`${title} metric card`}>
      <span className={`font-semibold tracking-tight`}>{title}</span>
      <span className="text-2xl font-bold">{value}</span>
      <span className={`${tone.textSubtle}`}>{trend}</span>
    </div>
  );

  return (
    <div className={`flex h-60 flex-col overflow-hidden rounded-2xl ${tone.frame} ${scale.text}`}>
      <header className={`flex items-center justify-between ${tone.header} ${scale.headerPad}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Recon Workspace</span>
            <span className={`rounded-full ${tone.accentSoft} ${tone.accentBorder} ${scale.badge}`}>live sync</span>
          </div>
        </div>
        <div className={`flex items-center gap-3 ${tone.textSubtle}`}>
          <span>Last ingest • 2m ago</span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Healthy
          </span>
        </div>
      </header>
      <div className={`flex flex-1 flex-col ${scale.contentPad} ${scale.gap}`}>
        <div className={`grid flex-1 ${scale.gap} md:grid-cols-[1.4fr,0.8fr]`}>
          <div className={`flex flex-col ${scale.gap}`}>
            <div className={`grid ${scale.gap} sm:grid-cols-2`}
              role="presentation">
              {metricCard('Hosts scanned', '128', '+12 since yesterday')}
              {metricCard('Credentials', '42', '5 flagged for review')}
            </div>
            <div className={`rounded-2xl ${tone.metric} ${scale.itemPad} flex flex-col ${scale.gap}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold tracking-tight">Activity timeline</span>
                <span className={`${tone.textSubtle}`}>Most recent events</span>
              </div>
              <div className={`flex flex-col ${scale.gap}`}
                role="list">
                {[{
                  title: 'New service discovered on 10.0.8.12',
                  meta: 'port 8080 • HTTPS',
                }, {
                  title: 'Credential reuse detected for admin account',
                  meta: 'password audit • high impact',
                }, {
                  title: 'Baseline drift on staging subnet',
                  meta: 'anomaly • investigate',
                }].map((item) => (
                  <div key={item.title}
                    className={`flex items-start gap-3 rounded-xl border border-dashed ${tone.timeline} ${scale.itemPad}`}
                    role="listitem">
                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className={`${tone.textSubtle}`}>{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className={`rounded-2xl ${tone.metric} ${scale.itemPad} flex flex-col ${scale.gap}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold tracking-tight">Playbook queue</span>
              <span className={`${tone.textSubtle}`}>3 automations</span>
            </div>
            <div className={`flex flex-col ${scale.gap}`}>
              {[{
                name: 'Enumerate subdomains',
                status: 'Running • 68% complete',
              }, {
                name: 'Generate credential wordlist',
                status: 'Queued • awaiting approval',
              }, {
                name: 'Map lateral movement paths',
                status: 'Idle • last run 1h ago',
              }].map((task) => (
                <div key={task.name}
                  className={`rounded-xl ${tone.frameMuted} ${scale.itemPad} border border-transparent`}
                  role="group">
                  <p className="font-medium">{task.name}</p>
                  <p className={`${tone.textSubtle}`}>{task.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CommandCenterPreview = ({ theme, density }: ShellRenderProps) => {
  const tone = palette[theme];
  const scale = densityScale[density];

  return (
    <div className={`flex h-60 flex-col overflow-hidden rounded-2xl ${tone.frame} ${scale.text}`}>
      <header className={`flex items-center justify-between ${tone.header} ${scale.headerPad}`}>
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight">Command Center</span>
          <span className={`rounded-full ${tone.accentSoft} ${tone.accentBorder} ${scale.badge}`}>session 7f4a</span>
        </div>
        <div className={`flex items-center gap-3 ${tone.textSubtle}`}>
          <span>Preview mode</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" aria-hidden="true" />
            Streaming
          </span>
        </div>
      </header>
      <div className={`grid flex-1 grid-cols-1 md:grid-cols-2 ${tone.frameMuted}`}>
        <div className={`flex flex-col border-b border-r border-transparent md:border-b-0 md:border-r ${rightBorderColor}`}>
          <div className={`flex-1 overflow-hidden ${tone.codeAlt} ${scale.contentPad}`}>
            <p className="font-semibold uppercase tracking-wide text-xs opacity-80">Execution log</p>
            <pre className={`mt-2 flex-1 overflow-auto rounded-xl ${tone.code} ${scale.itemPad} font-mono`}>
{`[*] hydra --login admin --wordlist shortlist.txt --protocol ssh 10.0.8.12
[>] Scheduling 16 workers for credential spray
[+] 10.0.8.12:22 login:admin password:winter2024!
[~] Capturing session artifacts -> evidence vault
[!] MFA challenge triggered, switching to manual review`}
            </pre>
          </div>
        </div>
        <div className={`flex flex-col ${scale.contentPad} ${tone.metric} ${scale.gap}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold tracking-tight">Signal monitors</span>
            <span className={`${tone.textSubtle}`}>auto-refresh 30s</span>
          </div>
          <div className={`grid ${scale.gap} sm:grid-cols-2`}>
            {[{
              label: 'Credential health',
              value: 'Stable',
              hint: '4 rotations pending',
            }, {
              label: 'Alert volume',
              value: 'Quiet',
              hint: '2 anomalies muted',
            }].map((card) => (
              <div key={card.label}
                className={`rounded-xl ${tone.frameMuted} ${scale.itemPad} border border-transparent`}
                role="group">
                <p className="font-medium">{card.label}</p>
                <p className="text-lg font-semibold">{card.value}</p>
                <p className={`${tone.textSubtle}`}>{card.hint}</p>
              </div>
            ))}
          </div>
          <div className={`rounded-xl ${tone.frameMuted} ${scale.itemPad} border border-transparent`}
            role="group">
            <p className="font-medium">Next steps</p>
            <ul className={`mt-1 list-disc pl-4 ${tone.textSubtle}`}>
              <li>Escalate credential reuse to IAM team</li>
              <li>Stage lateral movement map for analyst review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickPanelPreview = ({ theme, density }: ShellRenderProps) => {
  const tone = palette[theme];
  const scale = densityScale[density];

  const toggles = [
    { id: 'lab-mode', label: 'Lab mode', description: 'Simulated tooling with safe outputs', active: true },
    { id: 'sound', label: 'Sound cues', description: 'Play notifications for new findings', active: false },
    { id: 'network', label: 'Offline cache', description: 'Pin datasets for travel workflows', active: true },
  ];

  const shortcuts = [
    { label: '⌘ + ⇧ + A', description: 'Open command palette' },
    { label: '⌘ + K', description: 'Focus global search' },
    { label: '⌥ + 1', description: 'Toggle activity overview' },
  ];

  return (
    <div className={`flex h-60 flex-col overflow-hidden rounded-2xl ${tone.frame} ${scale.text}`}>
      <header className={`flex items-center justify-between ${tone.header} ${scale.headerPad}`}>
        <span className="font-semibold tracking-tight">Quick controls</span>
        <span className={`${tone.textSubtle}`}>Shift + P</span>
      </header>
      <div className={`flex flex-1 flex-col ${scale.contentPad} ${scale.gap}`}>
        <div className={`grid flex-1 grid-cols-1 gap-4 md:grid-cols-2`}>
          <div className={`rounded-2xl ${tone.metric} ${scale.itemPad} flex flex-col ${scale.gap}`}>
            <span className="font-semibold tracking-tight">Toggles</span>
            <ul className={`flex flex-col ${scale.gap}`}>{toggles.map((toggle) => (
              <li key={toggle.id}
                className={`flex items-center justify-between rounded-xl ${tone.frameMuted} ${scale.itemPad}`}>
                <div>
                  <p className="font-medium">{toggle.label}</p>
                  <p className={`${tone.textSubtle}`}>{toggle.description}</p>
                </div>
                <span
                  className={`inline-flex h-6 items-center rounded-full border px-1 ${
                    toggle.active
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-600 bg-transparent text-slate-400'
                  }`}
                  role="switch"
                  aria-checked={toggle.active}
                  aria-label={toggle.label}
                >
                  <span className={`h-4 w-4 rounded-full bg-white transition ${toggle.active ? 'translate-x-3' : ''}`} />
                </span>
              </li>
            ))}</ul>
          </div>
          <div className={`rounded-2xl ${tone.metric} ${scale.itemPad} flex flex-col ${scale.gap}`}>
            <span className="font-semibold tracking-tight">Shortcuts</span>
            <div className={`flex flex-col ${scale.gap}`}>
              {shortcuts.map((shortcut) => (
                <div key={shortcut.label}
                  className={`rounded-xl ${tone.frameMuted} ${scale.itemPad} border border-transparent`}
                >
                  <p className="font-mono text-sm font-semibold">{shortcut.label}</p>
                  <p className={`${tone.textSubtle}`}>{shortcut.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={`rounded-xl ${tone.metric} ${scale.itemPad} flex items-center justify-between`}>
          <div>
            <p className="font-semibold">Desktop profile</p>
            <p className={`${tone.textSubtle}`}>Using Kali Dark • Wallpaper: Matrix grid</p>
          </div>
          <button type="button" className={`rounded-full border px-3 py-1 font-medium transition ${tone.accentSoft}`}>
            Customize
          </button>
        </div>
      </div>
    </div>
  );
};

const shellVariants: ShellVariant[] = [
  {
    id: 'workspace-shell',
    title: 'Workspace shell',
    description:
      'Primary desktop window chrome with metrics, activity timeline, and automation queue layout.',
    render: (props) => <WorkspacePreview {...props} />,
  },
  {
    id: 'command-center-shell',
    title: 'Command center shell',
    description:
      'Split view optimized for live command streaming with paired telemetry panels.',
    render: (props) => <CommandCenterPreview {...props} />,
  },
  {
    id: 'quick-panel-shell',
    title: 'Quick panel shell',
    description:
      'Compact control palette for lab toggles, shortcuts, and personalization settings.',
    render: (props) => <QuickPanelPreview {...props} />,
  },
];

function ShellExampleFrame({
  variant,
  density,
  showGrid,
}: {
  variant: ShellVariant;
  density: DensityMode;
  showGrid: boolean;
}) {
  const gridStyle: CSSProperties | undefined = useMemo(() => {
    if (!showGrid) return undefined;
    const size = densityScale[density].grid;
    return {
      backgroundImage:
        'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
      backgroundSize: `${size}px ${size}px`,
    } satisfies CSSProperties;
  }, [density, showGrid]);

  const ThemePanel = ({ theme }: { theme: ThemeMode }) => (
    <div className="space-y-3" aria-label={`${variant.title} in ${theme} theme`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
        <span>{theme === 'light' ? 'Light theme' : 'Dark theme'}</span>
        {showGrid && <span>Grid {densityScale[density].grid}px</span>}
      </div>
      <div
        className={`overflow-hidden rounded-2xl border ${
          theme === 'light'
            ? 'border-slate-200 bg-gradient-to-br from-white to-slate-100'
            : 'border-slate-800 bg-slate-950/70'
        }`}
        style={gridStyle}
      >
        {variant.render({ theme, density })}
      </div>
    </div>
  );

  return (
    <article key={variant.id} className="space-y-4 rounded-3xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-inner shadow-black/20">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-white">{variant.title}</h2>
        <p className="text-sm text-slate-300">{variant.description}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <ThemePanel theme="light" />
        <ThemePanel theme="dark" />
      </div>
    </article>
  );
}

export default function ShellCatalogPage() {
  useDevRouteGuard();
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [showGrid, setShowGrid] = useState(false);

  if (!DEV_FLAG) {
    return <GuardMessage />;
  }

  return (
    <>
      <Head>
        <title>Shell catalog | Kali desktop UI</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 text-slate-100">
        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-16">
          <header className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Dev catalog</p>
              <h1 className="text-3xl font-semibold tracking-tight">Shell component playground</h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Preview the desktop shell patterns used across the Kali portfolio. Use the density controls to test spacing states
                and toggle the measurement grid to audit layout rhythm before shipping new chrome variants.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-slate-400">Density</span>
                <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/70 p-1">
                  {densityOptions.map((option) => {
                    const active = density === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setDensity(option.id)}
                        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                          active
                            ? 'bg-sky-500/20 text-white shadow-sm shadow-sky-500/40'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <label htmlFor="spacing-grid" className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Spacing grid</span>
                  <span className="relative inline-flex h-6 w-11 items-center rounded-full border border-slate-700 bg-slate-900/80">
                    <input
                      id="spacing-grid"
                      type="checkbox"
                      checked={showGrid}
                      onChange={() => setShowGrid((prev) => !prev)}
                      aria-label="Toggle spacing grid overlay"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                    <span
                      className={`ml-1 h-4 w-4 rounded-full bg-white transition ${showGrid ? 'translate-x-5 bg-sky-400' : ''}`}
                    />
                  </span>
                </label>
                <span className="text-xs text-slate-500">Overlay layout grid to debug spacing tokens</span>
              </div>
              <Link
                href={DOC_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-500/40 hover:text-white"
              >
                Documentation
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </header>
          <section className="space-y-10">
            {shellVariants.map((variant) => (
              <ShellExampleFrame key={variant.id} variant={variant} density={density} showGrid={showGrid} />
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
