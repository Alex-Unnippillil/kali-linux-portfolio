import Head from 'next/head';
import { useMemo, useState } from 'react';

const difficultyStyles = {
  Beginner:
    'bg-emerald-900/40 text-emerald-100 border border-emerald-500/30 shadow-[0_12px_32px_rgba(16,185,129,0.15)]',
  Intermediate:
    'bg-amber-900/40 text-amber-100 border border-amber-400/30 shadow-[0_12px_32px_rgba(245,158,11,0.12)]',
  Advanced:
    'bg-rose-900/50 text-rose-100 border border-rose-400/30 shadow-[0_12px_32px_rgba(244,63,94,0.12)]',
};

const scenarios = [
  {
    id: 'devops-bastion',
    name: 'DevOps Bastion',
    target: 'bastion.lab:22',
    service: 'ssh',
    difficulty: 'Intermediate',
    warning: 'Simulated fail2ban lockout after five bad pairs.',
    description:
      'Model an internal SSH bastion hardened with IP-based throttling and short password reuse detection windows.',
    notes: ['Audit attempt pacing every 20s', 'Observe when throttling engages'],
  },
  {
    id: 'vpn-portal',
    name: 'VPN Portal',
    target: 'vpn.lab/login.php',
    service: 'http-post-form',
    difficulty: 'Advanced',
    warning: 'Web application firewall replica enforces dual throttles and CAPTCHA injection.',
    description:
      'Practice form-based spraying with CSRF tokens, cookie handling, and rotating user agents against a simulated perimeter VPN.',
    notes: ['Rotate UA headers', 'Leverage low-and-slow timings'],
  },
  {
    id: 'mail-smtp',
    name: 'Legacy Mail Relay',
    target: 'mail.lab:587',
    service: 'smtp',
    difficulty: 'Beginner',
    warning: 'Basic lockout notice at 10 attempts; verbose server banners retained.',
    description:
      'A teaching scenario for understanding SMTP authentication logging, with relaxed throttles and detailed responses.',
    notes: ['Capture AUTH banners', 'Baseline connection telemetry'],
  },
];

const usernameLists = [
  {
    id: 'ops',
    label: 'corp-ops-users.txt',
    description: '12 DevOps service accounts curated for the bastion exercise.',
    preview: ['deploy', 'jenkins', 'pipeline', 'infra-ci'],
  },
  {
    id: 'remote',
    label: 'remote-access.txt',
    description: 'High-value VPN operators sourced from the tabletop dataset.',
    preview: ['sso-admin', 'helpdesk', 'noc-duty'],
  },
  {
    id: 'legacy',
    label: 'legacy-mail-users.txt',
    description: 'Helpdesk-friendly aliases mapped to the SMTP relay.',
    preview: ['archive', 'reports', 'salesmgr'],
  },
];

const passwordLists = [
  {
    id: 'seasonal',
    label: 'seasonal-2024.txt',
    description: 'Updated quarterly defaults with keyboard walks and seasonality.',
    preview: ['Winter2024!', 'Spring2024!', 'Q4Rainbow!'],
  },
  {
    id: 'vpn-safe',
    label: 'vpn-wordlist.txt',
    description: 'Shortlist from phishing simulations focused on remote staff.',
    preview: ['BlueSky!7', 'Oceanic#22', 'BadgeAccess!'],
  },
  {
    id: 'mail-fallback',
    label: 'mail-defaults.txt',
    description: 'Legacy vendor defaults and weak service credentials.',
    preview: ['changeme', 'welcome1', 'support'],
  },
];

const mitigationTips = [
  'Use adaptive MFA challenges to invalidate bulk credential stuffing.',
  'Enable progressive backoff with user notifications after repeated failures.',
  'Monitor perimeter services with canary accounts tuned for early lockouts.',
  'Rotate shared accounts into just-in-time workflows rather than static passwords.',
];

const serviceIconMap = {
  ssh: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 text-sky-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M4 8h16M4 12h16M4 16h8" strokeLinecap="round" />
      <path
        d="M14 16l2 2 4-4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-300"
      />
    </svg>
  ),
  'http-post-form': (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 text-amber-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M7 9h10M7 13h6" strokeLinecap="round" />
      <path
        d="M17 13l2 2-2 2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-rose-300"
      />
    </svg>
  ),
  smtp: (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6 text-indigo-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 16h4" strokeLinecap="round" />
    </svg>
  ),
};

const statusMessages = {
  off: {
    tone: 'border-amber-500/40 bg-amber-950/40 text-amber-200',
    label: 'Lab mode disabled',
    description:
      'Interactive controls are read-only. Enable lab mode to unlock the sandboxed Hydra workflow.',
  },
  on: {
    tone: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200',
    label: 'Lab mode active',
    description:
      'All actions stay offline and operate on fixtures. Progress indicators reflect simulated runtime only.',
  },
};

const highlightClass = (line) => {
  if (line.includes('[result]')) return 'text-emerald-300';
  if (line.includes('[warning]')) return 'text-amber-300';
  if (line.includes('[error]')) return 'text-rose-300';
  if (line.includes('[attempt]')) return 'text-sky-300';
  if (line.includes('[status]')) return 'text-purple-300';
  return 'text-slate-200';
};

const HydraScenarioPage = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [userListId, setUserListId] = useState(usernameLists[0].id);
  const [passListId, setPassListId] = useState(passwordLists[0].id);
  const [labMode, setLabMode] = useState(false);

  const scenario = useMemo(
    () => scenarios.find((item) => item.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId]
  );
  const userList = useMemo(
    () => usernameLists.find((item) => item.id === userListId) ?? usernameLists[0],
    [userListId]
  );
  const passList = useMemo(
    () => passwordLists.find((item) => item.id === passListId) ?? passwordLists[0],
    [passListId]
  );

  const command = labMode
    ? `hydra -L ${userList.label} -P ${passList.label} ${scenario.service}://${scenario.target}`
    : '# Enable lab mode to generate runnable commands';

  const sampleLog = useMemo(() => {
    if (!labMode) {
      return ['# Controls locked – toggle lab mode to stream simulated output.'];
    }
    const attemptPreview = `${userList.preview[0] || 'user'}:${passList.preview[0] || 'password'}`;
    return [
      '[status] hydra v9.5 (offline simulation)',
      `[info] Target: ${scenario.target} via ${scenario.service}`,
      `[info] Username list: ${userList.label} (${userList.preview.length} previewed entries)`,
      `[info] Password list: ${passList.label} (${passList.preview.length} previewed entries)`,
      `[attempt] ${attemptPreview} -> denied (rate-limit counter +1)`,
      `[warning] ${scenario.warning}`,
      '[result] Completed dry-run – no network connections attempted.',
    ];
  }, [labMode, passList, scenario, userList]);

  const status = labMode ? statusMessages.on : statusMessages.off;

  return (
    <>
      <Head>
        <title>Hydra Scenario Workbench</title>
      </Head>
      <main className="min-h-screen bg-[#04070c] text-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Hydra Simulation Lab
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Scenario Picker &amp; Command Composer
            </h1>
            <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
              Choose a training scenario, compose offline commands, and review mitigations. Every
              interaction stays local to the browser&mdash;no real network traffic is performed.
            </p>
          </header>

          <section
            aria-live="polite"
            className={`relative overflow-hidden rounded-2xl border p-5 transition-colors sm:p-6 ${status.tone}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                  {status.label}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-white/80">{status.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setLabMode((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070c]"
                aria-pressed={labMode}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${labMode ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                {labMode ? 'Disable lab mode' : 'Enable lab mode'}
              </button>
            </div>
            <div className="mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="progress-bar h-full w-1/3 bg-white/40" />
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.4em] text-white/60">
                Simulated session heartbeat
              </p>
            </div>
            <span className="sr-only">{status.label}</span>
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <section aria-labelledby="scenario-heading" className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 id="scenario-heading" className="text-lg font-semibold text-white">
                  Scenario picker
                </h2>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  {scenario.service.toUpperCase()} target
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {scenarios.map((item) => {
                  const active = item.id === scenario.id;
                  const Icon = serviceIconMap[item.service];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedScenarioId(item.id)}
                      className={`group flex h-full flex-col gap-3 rounded-xl border border-slate-700/40 bg-slate-900/40 p-4 text-left shadow-[0_18px_42px_rgba(8,25,53,0.35)] transition hover:border-slate-400/60 hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#04070c] ${
                        active ? 'border-sky-400/60 bg-slate-900/70' : ''
                      } ${!labMode ? 'opacity-80' : ''}`}
                      aria-pressed={active}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80">
                            {Icon}
                          </span>
                          <div>
                            <p className="text-base font-semibold text-white">{item.name}</p>
                            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                              {item.target}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
                            difficultyStyles[item.difficulty]
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{item.description}</p>
                      <ul className="flex flex-wrap gap-2">
                        {item.notes.map((note) => (
                          <li
                            key={note}
                            className="rounded-full border border-slate-600/40 bg-slate-800/60 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-slate-300"
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-amber-100">
                        <span aria-hidden className="mt-0.5 text-lg font-bold text-amber-300">
                          !
                        </span>
                        <p className="text-xs uppercase tracking-[0.25em]">{item.warning}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="composer-heading" className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 id="composer-heading" className="text-lg font-semibold text-white">
                  Command composer
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Offline only
                </span>
              </div>
              <div className="space-y-4 rounded-xl border border-slate-700/40 bg-slate-900/40 p-5 shadow-[0_18px_42px_rgba(8,25,53,0.35)]">
                <label className="block text-sm font-semibold text-slate-200" htmlFor="userList">
                  Username list
                </label>
                <select
                  id="userList"
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={userListId}
                  onChange={(event) => setUserListId(event.target.value)}
                  disabled={!labMode}
                  aria-describedby="userListHelp"
                >
                  {usernameLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.label}
                    </option>
                  ))}
                </select>
                <p id="userListHelp" className="text-xs text-slate-400">
                  {userList.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  {userList.preview.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-600/40 bg-slate-800/60 px-3 py-1 uppercase tracking-[0.25em]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <label className="block text-sm font-semibold text-slate-200" htmlFor="passList">
                  Password list
                </label>
                <select
                  id="passList"
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={passListId}
                  onChange={(event) => setPassListId(event.target.value)}
                  disabled={!labMode}
                  aria-describedby="passListHelp"
                >
                  {passwordLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.label}
                    </option>
                  ))}
                </select>
                <p id="passListHelp" className="text-xs text-slate-400">
                  {passList.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  {passList.preview.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-600/40 bg-slate-800/60 px-3 py-1 uppercase tracking-[0.25em]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-700/40 bg-black/40 p-5 font-mono text-sm text-slate-100 shadow-[0_18px_42px_rgba(8,25,53,0.35)]">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">hydra command</p>
                <code className="block overflow-x-auto whitespace-pre-wrap text-sky-200">{command}</code>
              </div>
              <div className="space-y-3 rounded-xl border border-slate-700/40 bg-black/60 p-5 font-mono text-xs text-slate-200 shadow-[0_18px_42px_rgba(8,25,53,0.35)]">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">sample output log</p>
                <pre className="overflow-x-auto whitespace-pre-wrap">
                  {sampleLog.map((line) => (
                    <span key={line} className={`${highlightClass(line)} block`}> 
                      {line}
                    </span>
                  ))}
                </pre>
              </div>
            </section>
          </div>

          <section aria-labelledby="mitigation-heading" className="space-y-4 rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 shadow-[0_18px_42px_rgba(8,25,53,0.35)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="mitigation-heading" className="text-lg font-semibold text-white">
                Mitigation tips
              </h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Defender playbook
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {mitigationTips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-900/10 p-4 text-sm text-emerald-100"
                >
                  <span aria-hidden className="mt-0.5 h-2 w-2 rounded-full bg-emerald-300" />
                  <p>{tip}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <style jsx>{`
        .progress-bar {
          animation: progress-loop 3s linear infinite;
          transform-origin: left center;
        }
        @keyframes progress-loop {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </>
  );
};

export default HydraScenarioPage;
