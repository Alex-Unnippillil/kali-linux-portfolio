import React, { useState } from "react";
import WarningBanner from "../../WarningBanner";

// Demo output for each tab
const demoOutput = {
  dump: [
    "[*] lsass.exe (1234)",
    "[+] Dump saved to C:/dumps/lsass.dmp",
    "Token: 0123456789ABCDEF0123456789ABCDEF",
  ],
  tokens: [
    "NTLM hash: 5d41402abc4b2a76b9719d911017c592",
    "Token: FEDCBA9876543210FEDCBA9876543210",
  ],
  tickets: [
    "Kerberos Ticket: 05000000123456789abcdef",
    "Ticket cache: user@EXAMPLE.COM",
  ],
};

const tabs = [
  { id: "dump", label: "Dump", icon: "💾" },
  { id: "tokens", label: "Tokens", icon: "🔑" },
  { id: "tickets", label: "Tickets", icon: "🎫" },
];

// Masks tokens and hashes unless unmasked by user
const maskSensitive = (line, show) => {
  const match = line.match(
    /(Token|NTLM hash|Kerberos Ticket|Ticket cache):\s*(\S+)/i,
  );
  if (!match) return line;
  const [, label, value] = match;
  return (
    <>
      {label}: <span className="p-[var(--space-1-5)]">{show ? value : "********"}</span>
    </>
  );
};

const MimikatzApp = () => {
  const [active, setActive] = useState("dump");
  const [showSensitive, setShowSensitive] = useState(false);

  const output = demoOutput[active];

  const copyLine = async (line) => {
    try {
      await navigator.clipboard.writeText(line);
    } catch {}
  };

  const exportOutput = () => {
    const blob = new Blob([output.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active}-output.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <WarningBanner>
        Demo only. No real credentials are used.
      </WarningBanner>
      <div className="flex border-b border-gray-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-1 px-4 py-2 ${
              active === t.id ? "bg-purple-700" : "bg-purple-600"
            }`}
            onClick={() => setActive(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="p-2 flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-2 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={showSensitive}
              onChange={(e) => setShowSensitive(e.target.checked)}
            />
            Show tokens
          </label>
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={exportOutput}
          >
            Export
          </button>
        </div>
        <div className="bg-black text-green-400 font-mono text-sm p-2 rounded">
          {output.map((line, idx) => (
            <div key={idx} className="flex items-start">
              <span className="flex-1 whitespace-pre-wrap">
                {maskSensitive(line, showSensitive)}
              </span>
              <button
                className="ml-2 text-gray-400 hover:text-white"
                onClick={() => copyLine(line)}
                aria-label="copy line"
              >
                📋
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
