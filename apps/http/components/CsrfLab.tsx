'use client';

import { useMemo, useState, type FC, type ReactNode } from 'react';
import ToggleSwitch from '@/components/ToggleSwitch';
import { useCsrfLabState, SameSiteMode } from '../state/csrfLab';

const TARGET_ORIGIN = 'https://bank.local';
const ATTACKER_ORIGIN = 'http://evil.local';

const sameSiteOptions: { value: SameSiteMode; label: string }[] = [
  { value: 'Strict', label: 'Strict' },
  { value: 'Lax', label: 'Lax' },
  { value: 'None', label: 'None' },
];

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'victim', label: 'Victim App' },
  { id: 'attacker', label: 'Attacker Site' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const ResultBadge = ({ success }: { success: boolean }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
      success ? 'bg-green-600 text-green-50' : 'bg-red-700 text-red-100'
    }`}
  >
    {success ? 'Cookie sent' : 'Cookie blocked'}
  </span>
);

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg bg-gray-800/80 p-4 shadow-lg shadow-black/30">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <div className="mt-3 text-sm text-gray-200 space-y-3">{children}</div>
  </section>
);

const buildVictimDoc = (
  sameSite: SameSiteMode,
  secure: boolean,
  cookieName: string,
  value: string,
  path: string,
) => {
  const secureFlag = secure ? '; Secure' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #e5e7eb; }
  header { background: #111827; padding: 12px; font-size: 14px; }
  main { padding: 12px 16px; font-size: 13px; line-height: 1.5; }
  code { display: block; margin-top: 8px; padding: 10px 12px; border-radius: 8px; background: #1f2937; color: #34d399; }
  p { margin: 0; }
</style>
</head>
<body>
  <header>${TARGET_ORIGIN}</header>
  <main>
    <p>The banking app keeps a cookie for authenticated transfers:</p>
    <code>${cookieName}=${value}; SameSite=${sameSite}${secureFlag}; Path=${path}</code>
    <p style="margin-top:12px;">This sandbox only mirrors the cookie for training. Nothing is stored on disk.</p>
  </main>
</body>
</html>`;
};

const buildAttackerDoc = (
  success: boolean,
  narrative: string,
) => {
  const badgeColour = success ? '#16a34a' : '#b91c1c';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; margin: 0; background: #0b1120; color: #e5e7eb; }
  header { background: #111827; padding: 12px; font-size: 14px; }
  main { padding: 12px 16px; font-size: 13px; line-height: 1.5; }
  .panel { margin-top: 12px; padding: 14px; border-radius: 10px; background: #1f2937; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 12px; background: ${badgeColour}; color: #f9fafb; }
  p { margin: 0; }
</style>
</head>
<body>
  <header>${ATTACKER_ORIGIN}</header>
  <main>
    <p>This attacker frame posts a hidden form to ${TARGET_ORIGIN}/transfer.</p>
    <div class="panel">
      <span class="badge">${success ? 'Cookie sent' : 'Cookie blocked'}</span>
      <p style="margin-top:10px;">${narrative}</p>
    </div>
    <p style="margin-top:12px;">Modify the cookie attributes in the lab and watch this result update instantly.</p>
  </main>
</body>
</html>`;
};

const CsrfLab: FC = () => {
  const { cookie, explanations, setSameSite, setSecure, reset } = useCsrfLabState();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const attackSucceeds = cookie.sameSite === 'None' && cookie.secure;

  const overviewExplanation = explanations[cookie.sameSite];

  const attackNarrative = useMemo(() => {
    if (cookie.sameSite === 'None' && cookie.secure) {
      return 'SameSite=None permits the cookie on cross-site requests. Because it is Secure, it still travels over HTTPS and the forged transfer would succeed.';
    }
    if (cookie.sameSite === 'None') {
      return 'Browsers reject SameSite=None cookies that omit the Secure attribute, so the banking session never sticks and the forged transfer fails.';
    }
    if (cookie.sameSite === 'Lax') {
      return 'SameSite=Lax blocks background POSTs like this forged request, preventing the cookie from riding along.';
    }
    return 'SameSite=Strict keeps the cookie scoped to the banking site, so the forged transfer is blocked.';
  }, [cookie.sameSite, cookie.secure]);

  const victimDoc = useMemo(
    () => buildVictimDoc(cookie.sameSite, cookie.secure, cookie.name, cookie.value, cookie.path),
    [cookie.name, cookie.path, cookie.sameSite, cookie.secure, cookie.value],
  );

  const attackerDoc = useMemo(
    () => buildAttackerDoc(attackSucceeds, attackNarrative),
    [attackNarrative, attackSucceeds],
  );

  const resultNarrative = attackNarrative;

  const handleReset = () => {
    reset();
    setActiveTab('overview');
  };

  return (
    <div className="flex h-full w-full flex-col space-y-4 overflow-auto bg-gray-900/95 p-4 text-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">CSRF Cookie Lab</h2>
          <p className="text-sm text-gray-300">
            Explore how SameSite and Secure influence a browser&apos;s decision to send cookies with cross-site form submissions.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="self-start rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black shadow"
        >
          Reset Lab
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded px-3 py-1 font-medium ${
              tab.id === activeTab ? 'bg-ub-orange text-black' : 'bg-gray-800 text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Cookie controls">
              <div>
                <label htmlFor="csrf-samesite" className="block text-xs uppercase tracking-wide text-gray-400">
                  SameSite attribute
                </label>
                <select
                  id="csrf-samesite"
                  value={cookie.sameSite}
                  onChange={(e) => setSameSite(e.target.value as SameSiteMode)}
                  className="mt-1 w-full rounded border border-gray-700 bg-gray-900 p-2 text-sm text-white"
                >
                  {sameSiteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  checked={cookie.secure}
                  onChange={(value) => setSecure(value)}
                  ariaLabel="Toggle Secure attribute"
                />
                <span>{cookie.secure ? 'Secure cookie' : 'Insecure cookie'}</span>
              </div>
              {cookie.sameSite === 'None' && !cookie.secure && (
                <p className="text-xs text-yellow-300">
                  Browsers reject SameSite=None cookies that omit Secure. Enable the Secure flag to model compliant behaviour.
                </p>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Set-Cookie preview</p>
                <code className="mt-2 block rounded bg-black/80 px-3 py-2 font-mono text-xs text-green-300">
                  {`Set-Cookie: ${cookie.name}=${cookie.value}; Path=${cookie.path}; SameSite=${cookie.sameSite}${
                    cookie.secure ? '; Secure' : ''
                  }`}
                </code>
              </div>
            </SectionCard>
            <SectionCard title="Cross-site submission outcome">
              <div className="flex items-center gap-3">
                <ResultBadge success={attackSucceeds} />
                <span>{resultNarrative}</span>
              </div>
              <div className="text-xs text-gray-400">
                <p>
                  Scenario: {ATTACKER_ORIGIN} hosts a hidden POST form targeting {TARGET_ORIGIN}/transfer.
                </p>
                <p>The status updates instantly as you change the cookie attributes.</p>
              </div>
            </SectionCard>
          </div>
          <SectionCard title="How SameSite modes behave">
            <p>{overviewExplanation}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {sameSiteOptions.map((option) => (
                <div
                  key={option.value}
                  className={`rounded border p-3 text-xs leading-snug ${
                    option.value === cookie.sameSite
                      ? 'border-ub-orange bg-gray-900 text-white'
                      : 'border-gray-700 bg-gray-900/60 text-gray-300'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
                    <span>{option.label}</span>
                    {option.value === cookie.sameSite && <span className="text-xs text-ub-orange">Selected</span>}
                  </div>
                  <p>{explanations[option.value]}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'victim' && (
        <div className="flex flex-1 flex-col gap-4">
          <SectionCard title="Session cookie snapshot">
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs text-gray-300">
              <dt className="text-gray-400">Domain</dt>
              <dd>{cookie.domain}</dd>
              <dt className="text-gray-400">Path</dt>
              <dd>{cookie.path}</dd>
              <dt className="text-gray-400">Name</dt>
              <dd>{cookie.name}</dd>
              <dt className="text-gray-400">Value</dt>
              <dd>{cookie.value}</dd>
              <dt className="text-gray-400">SameSite</dt>
              <dd>{cookie.sameSite}</dd>
              <dt className="text-gray-400">Secure</dt>
              <dd>{cookie.secure ? 'true' : 'false'}</dd>
            </dl>
          </SectionCard>
          <SectionCard title="Banking app preview">
            <iframe
              title="Victim app"
              className="h-56 w-full rounded border border-gray-700"
              sandbox="allow-scripts"
              srcDoc={victimDoc}
            />
            <p className="text-xs text-gray-400">
              The iframe runs entirely locally. It helps visualise the cookie attributes configured on the control panel.
            </p>
          </SectionCard>
        </div>
      )}

      {activeTab === 'attacker' && (
        <div className="flex flex-1 flex-col gap-4">
          <SectionCard title="Forged request analysis">
            <div className="flex items-center gap-3">
              <ResultBadge success={attackSucceeds} />
              <span>{resultNarrative}</span>
            </div>
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs text-gray-300">
              <dt className="text-gray-400">Origin</dt>
              <dd>{ATTACKER_ORIGIN}</dd>
              <dt className="text-gray-400">Target</dt>
              <dd>{`${TARGET_ORIGIN}/transfer`}</dd>
              <dt className="text-gray-400">Method</dt>
              <dd>POST</dd>
            </dl>
          </SectionCard>
          <SectionCard title="Attacker iframe">
            <iframe
              title="Attacker iframe"
              className="h-64 w-full rounded border border-gray-700"
              sandbox="allow-scripts"
              srcDoc={attackerDoc}
            />
            <p className="text-xs text-gray-400">
              This sandboxed frame never leaves your browser. It updates instantly to mirror how a real cross-site submission would
              be treated.
            </p>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

export default CsrfLab;
