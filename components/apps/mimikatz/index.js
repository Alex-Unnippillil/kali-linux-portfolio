import React, { useMemo, useState } from "react";
import WarningBanner from "../../WarningBanner";
import LabMode from "../../LabMode";
import CommandBuilder from "../../CommandBuilder";
import CredentialLocator from "./CredentialLocator";
import credentialDumps from "./credentialDumps.json";
import modules from "./modules.json";
import eventLogs from "./eventLogs.json";
import BlueTeamPanel from "../../../apps/mimikatz/components/BlueTeamPanel";

const maskSecret = (secret, reveal) => {
  if (reveal || !secret) return secret;
  const maskLength = Math.min(Math.max(secret.length, 8), 16);
  return "\u2022".repeat(maskLength);
};

const recordToClipboard = (record) =>
  [
    `Account: ${record.account}`,
    `Artifact: ${record.artifact}`,
    record.context ? `Context: ${record.context}` : null,
    `Secret: ${record.secret}`,
    `Explanation: ${record.explanation}`,
  ]
    .filter(Boolean)
    .join("\n");

const exportRecords = (records, title) => {
  if (!records?.length) return;
  try {
    const lines = records
      .map((record) => `${recordToClipboard(record)}\n`)
      .join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-fixtures.txt`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    /* noop in environments without Blob */
  }
};

const buildCommandString = (module, params) => {
  const target = (params.target || "").trim();
  const opts = (params.opts || "").trim();
  const parts = [module.name];
  if (target) parts.push(target);
  if (opts) parts.push(opts);
  const command = parts.join(" ").trim();
  return command
    ? `mimikatz.exe "privilege::debug" "${command}" exit`
    : 'mimikatz.exe "privilege::debug" exit';
};

const MimikatzApp = () => {
  const defaultTab = credentialDumps[0]?.id ?? "";
  const [active, setActive] = useState(defaultTab);
  const [revealSecrets, setRevealSecrets] = useState(false);

  const activeDump = useMemo(
    () => credentialDumps.find((dump) => dump.id === active) ?? credentialDumps[0],
    [active],
  );

  const handleCopy = async (record) => {
    const text = recordToClipboard(record);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore clipboard errors */
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <WarningBanner>
        Training dataset only. Enable Lab Mode to explore the guided credential lab.
      </WarningBanner>
      <div className="flex-1 overflow-hidden">
        <LabMode>
          <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-xs sm:text-sm">
            <section className="space-y-3 rounded border border-purple-500/40 bg-black/30 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Credential fixtures">
                  {credentialDumps.map((dump) => (
                    <button
                      key={dump.id}
                      type="button"
                      role="tab"
                      aria-selected={activeDump?.id === dump.id}
                      className={`rounded px-3 py-2 font-semibold transition ${
                        activeDump?.id === dump.id
                          ? "bg-purple-700 text-white"
                          : "bg-purple-600 text-purple-100 hover:bg-purple-500"
                      }`}
                      onClick={() => setActive(dump.id)}
                    >
                      {dump.title}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={revealSecrets}
                      onChange={(event) => setRevealSecrets(event.target.checked)}
                    />
                    Reveal sanitized secrets
                  </label>
                  <button
                    type="button"
                    className="rounded bg-purple-500 px-3 py-1 font-semibold text-black"
                    onClick={() => exportRecords(activeDump?.records, activeDump?.title || "mimikatz")}
                  >
                    Export dataset
                  </button>
                </div>
              </div>
              {activeDump && (
                <>
                  <p className="text-purple-100">{activeDump.summary}</p>
                  <div className="space-y-3">
                    {activeDump.records.map((record, index) => (
                      <div
                        key={`${record.account}-${record.artifact}-${index}`}
                        className="rounded border border-purple-500/40 bg-black/60 p-3"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold">{record.account}</p>
                            <p className="text-[11px] text-purple-200">{record.artifact}</p>
                          </div>
                          <button
                            type="button"
                            className="self-start rounded bg-purple-500 px-2 py-1 text-xs font-semibold text-black hover:bg-purple-400"
                            onClick={() => handleCopy(record)}
                            aria-label={`Copy ${record.account} record`}
                          >
                            Copy record
                          </button>
                        </div>
                        <div className="mt-2 font-mono text-green-300">
                          {maskSecret(record.secret, revealSecrets)}
                        </div>
                        {record.context && (
                          <p className="mt-2 text-[11px] text-purple-100">{record.context}</p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-200">{record.explanation}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded border border-gray-700 bg-black/30 p-3">
                <h2 className="text-sm font-bold text-purple-100">Safe command builders</h2>
                <p className="text-[11px] text-gray-300">
                  These forms only compose strings for demos. Commands are not executed.
                </p>
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className="rounded border border-purple-500/30 bg-black/60 p-3"
                  >
                    <h3 className="text-sm font-semibold text-purple-100">{module.name}</h3>
                    <p className="text-[11px] text-gray-200">{module.description}</p>
                    <CommandBuilder
                      doc={module.doc}
                      defaults={module.defaults}
                      build={(params) => buildCommandString(module, params)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded border border-blue-500/40 bg-blue-900/30 p-3">
                  <h2 className="text-sm font-bold text-blue-100">Blue team response checklist</h2>
                  <p className="text-[11px] text-blue-100">
                    Logs map to Windows security auditing guidance for detecting credential theft attempts.
                  </p>
                  <BlueTeamPanel logs={eventLogs} />
                </div>
                <CredentialLocator />
              </div>
            </section>
          </div>
        </LabMode>
      </div>
    </div>
  );
};

export default MimikatzApp;

export const displayMimikatz = (addFolder, openApp) => {
  return <MimikatzApp addFolder={addFolder} openApp={openApp} />;
};
