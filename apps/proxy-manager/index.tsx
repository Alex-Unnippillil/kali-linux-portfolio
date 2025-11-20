"use client";

import { useMemo, useState } from "react";
import Tabs from "../../components/Tabs";
import ToggleSwitch from "../../components/ToggleSwitch";

type ProxyProfile = {
  id: string;
  name: string;
  protocol: "HTTP" | "HTTPS" | "SOCKS4" | "SOCKS5";
  host: string;
  port: string;
  requiresAuth: boolean;
  username: string;
  password: string;
  autoRotate: boolean;
  enabled: boolean;
  notes: string;
};

type ProxyChain = {
  id: string;
  name: string;
  description: string;
  hops: string[];
  loadBalance: boolean;
  allowFailover: boolean;
  enabled: boolean;
};

type DiagnosticsState = {
  targetUrl: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
  chainId: string;
  includeHeaders: boolean;
  capturePackets: boolean;
  runTraceroute: boolean;
  simulateLatency: boolean;
};

const TABS = [
  { id: "profiles", label: "Profiles" },
  { id: "chains", label: "Chains" },
  { id: "diagnostics", label: "Diagnostics" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEFAULT_PROFILES: ProxyProfile[] = [
  {
    id: "corp-gateway",
    name: "Corp Gateway",
    protocol: "HTTPS",
    host: "gw.corp.local",
    port: "8443",
    requiresAuth: true,
    username: "analyst",
    password: "",
    autoRotate: true,
    enabled: true,
    notes: "Primary egress with audit logging.",
  },
  {
    id: "ops-logger",
    name: "Ops Logger",
    protocol: "HTTP",
    host: "172.16.20.12",
    port: "8080",
    requiresAuth: false,
    username: "",
    password: "",
    autoRotate: false,
    enabled: true,
    notes: "Inline metadata recorder for forensic review.",
  },
  {
    id: "tor-bridge",
    name: "Tor Research Bridge",
    protocol: "SOCKS5",
    host: "127.0.0.1",
    port: "9050",
    requiresAuth: false,
    username: "",
    password: "",
    autoRotate: false,
    enabled: false,
    notes: "Local bridge used for controlled dark-web recon.",
  },
];

const DEFAULT_CHAINS: ProxyChain[] = [
  {
    id: "internal-audit",
    name: "Internal Audit",
    description:
      "Route sensitive engagements through the gateway and logging proxy for review.",
    hops: ["corp-gateway", "ops-logger"],
    loadBalance: false,
    allowFailover: true,
    enabled: true,
  },
  {
    id: "research-stack",
    name: "Research Stack",
    description: "Blend traffic through Tor bridge for open-source investigations.",
    hops: ["corp-gateway", "tor-bridge"],
    loadBalance: true,
    allowFailover: true,
    enabled: false,
  },
];

const INITIAL_LOG = `${new Date().toLocaleTimeString()} • Proxy diagnostics initialized.`;

export default function ProxyManager() {
  const [activeTab, setActiveTab] = useState<TabId>("profiles");
  const [profiles, setProfiles] = useState<ProxyProfile[]>(DEFAULT_PROFILES);
  const [chains, setChains] = useState<ProxyChain[]>(DEFAULT_CHAINS);
  const [selectedChainId, setSelectedChainId] = useState<string>(
    DEFAULT_CHAINS[0]?.id ?? ""
  );
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    targetUrl: "https://example.com/api/health",
    method: "GET",
    chainId: DEFAULT_CHAINS[0]?.id ?? "",
    includeHeaders: true,
    capturePackets: false,
    runTraceroute: true,
    simulateLatency: false,
  });
  const [logEntries, setLogEntries] = useState<string[]>([INITIAL_LOG]);

  const profileLookup = useMemo(
    () =>
      profiles.reduce<Record<string, ProxyProfile>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {}),
    [profiles]
  );

  const selectedChain = useMemo(
    () => chains.find((chain) => chain.id === selectedChainId) ?? chains[0],
    [chains, selectedChainId]
  );

  const diagnosticsChain = useMemo(
    () => chains.find((chain) => chain.id === diagnostics.chainId),
    [chains, diagnostics.chainId]
  );

  const updateProfile = <K extends keyof ProxyProfile>(
    id: string,
    key: K,
    value: ProxyProfile[K]
  ) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, [key]: value } : profile
      )
    );
  };

  const addProfile = () => {
    const id = `profile-${Date.now()}`;
    const newProfile: ProxyProfile = {
      id,
      name: "New Proxy",
      protocol: "HTTPS",
      host: "",
      port: "8080",
      requiresAuth: false,
      username: "",
      password: "",
      autoRotate: false,
      enabled: true,
      notes: "",
    };
    setProfiles((current) => [...current, newProfile]);
  };

  const updateChain = <K extends keyof ProxyChain>(
    id: string,
    key: K,
    value: ProxyChain[K]
  ) => {
    setChains((current) =>
      current.map((chain) =>
        chain.id === id ? { ...chain, [key]: value } : chain
      )
    );
  };

  const updateChainHop = (id: string, hopIndex: number, profileId: string) => {
    setChains((current) =>
      current.map((chain) =>
        chain.id === id
          ? {
              ...chain,
              hops: chain.hops.map((hop, index) =>
                index === hopIndex ? profileId : hop
              ),
            }
          : chain
      )
    );
  };

  const addHopToChain = (id: string) => {
    const fallbackProfile = profiles[0]?.id ?? "";
    setChains((current) =>
      current.map((chain) =>
        chain.id === id
          ? { ...chain, hops: [...chain.hops, fallbackProfile] }
          : chain
      )
    );
  };

  const removeHopFromChain = (id: string, hopIndex: number) => {
    setChains((current) =>
      current.map((chain) => {
        if (chain.id !== id) return chain;
        if (chain.hops.length <= 1) return chain;
        return {
          ...chain,
          hops: chain.hops.filter((_, index) => index !== hopIndex),
        };
      })
    );
  };

  const addChain = () => {
    const id = `chain-${Date.now()}`;
    const fallbackProfile = profiles[0]?.id ?? "";
    const newChain: ProxyChain = {
      id,
      name: `Chain ${chains.length + 1}`,
      description: "Custom route for specialized engagements.",
      hops: fallbackProfile ? [fallbackProfile] : [],
      loadBalance: false,
      allowFailover: true,
      enabled: true,
    };
    setChains((current) => [...current, newChain]);
    setSelectedChainId(id);
    setDiagnostics((state) => ({ ...state, chainId: id }));
  };

  const updateDiagnostics = <K extends keyof DiagnosticsState>(
    key: K,
    value: DiagnosticsState[K]
  ) => {
    setDiagnostics((state) => ({ ...state, [key]: value }));
  };

  const runDiagnostics = () => {
    const activeChain = diagnosticsChain;
    const chainName = activeChain?.name ?? "Direct route";
    const enabledHops = activeChain
      ? activeChain.hops.filter((hop) => profileLookup[hop]?.enabled).length
      : 0;
    const optionList = [
      diagnostics.includeHeaders ? "header capture" : null,
      diagnostics.capturePackets ? "packet capture" : null,
      diagnostics.runTraceroute ? "hop trace" : null,
      diagnostics.simulateLatency ? "latency baseline" : null,
    ].filter(Boolean);

    const timestamp = new Date().toLocaleTimeString();
    const summary = `${timestamp} • ${diagnostics.method} ${diagnostics.targetUrl} via ${chainName}`;
    const detail = `    Options: ${
      optionList.length ? optionList.join(", ") : "none"
    } | ${enabledHops || "no"} enabled hop${enabledHops === 1 ? "" : "s"}`;
    const result =
      "    Result: ✅ Simulation complete — route ready for live testing.";

    setLogEntries((entries) => [
      [summary, detail, result].join("\n"),
      ...entries,
    ].slice(0, 12));
  };

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      <header className="border-b border-gray-800 bg-gray-950/70">
        <div className="mx-auto w-full max-w-6xl px-4">
          <Tabs
            tabs={TABS}
            active={activeTab}
            onChange={setActiveTab}
            className="flex-wrap gap-2"
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
          {activeTab === "profiles" && (
            <form
              onSubmit={(event) => event.preventDefault()}
              className="space-y-6"
            >
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
                {profiles.map((profile) => (
                  <section
                    key={profile.id}
                    className="flex flex-col gap-4 rounded-lg border border-gray-700 bg-gray-900/70 p-4 shadow-lg"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <label
                          htmlFor={`${profile.id}-name`}
                          className="block text-xs font-semibold uppercase tracking-widest text-orange-300"
                        >
                          Profile Name
                        </label>
                        <input
                          id={`${profile.id}-name`}
                          aria-label="Profile name"
                          value={profile.name}
                          onChange={(event) =>
                            updateProfile(profile.id, "name", event.target.value)
                          }
                          className="mt-1 w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <ToggleSwitch
                          checked={profile.enabled}
                          onChange={(checked) =>
                            updateProfile(profile.id, "enabled", checked)
                          }
                          ariaLabel={`Toggle ${profile.name} profile`}
                        />
                        <span className="text-sm text-gray-300">
                          {profile.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`${profile.id}-protocol`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Protocol
                        </label>
                        <select
                          id={`${profile.id}-protocol`}
                          aria-label="Protocol"
                          value={profile.protocol}
                          onChange={(event) =>
                            updateProfile(
                              profile.id,
                              "protocol",
                              event.target.value as ProxyProfile["protocol"]
                            )
                          }
                          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                        >
                          <option value="HTTP">HTTP</option>
                          <option value="HTTPS">HTTPS</option>
                          <option value="SOCKS4">SOCKS4</option>
                          <option value="SOCKS5">SOCKS5</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`${profile.id}-host`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Host
                        </label>
                        <input
                          id={`${profile.id}-host`}
                          aria-label="Proxy host"
                          value={profile.host}
                          onChange={(event) =>
                            updateProfile(profile.id, "host", event.target.value)
                          }
                          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                          placeholder="proxy.example"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`${profile.id}-port`}
                          className="mb-1 block text-sm font-medium"
                        >
                          Port
                        </label>
                        <input
                          id={`${profile.id}-port`}
                          aria-label="Proxy port"
                          value={profile.port}
                          onChange={(event) =>
                            updateProfile(profile.id, "port", event.target.value)
                          }
                          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                        <div>
                          <p className="text-sm font-medium">Authentication</p>
                          <p className="text-xs text-gray-300">
                            Enable when the proxy requires credentials.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={profile.requiresAuth}
                          onChange={(checked) =>
                            updateProfile(
                              profile.id,
                              "requiresAuth",
                              checked
                            )
                          }
                          ariaLabel={`Toggle authentication for ${profile.name}`}
                        />
                      </div>
                    </div>
                    {profile.requiresAuth && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label
                            htmlFor={`${profile.id}-username`}
                            className="mb-1 block text-sm font-medium"
                          >
                            Username
                          </label>
                          <input
                            id={`${profile.id}-username`}
                            aria-label="Proxy username"
                            value={profile.username}
                            onChange={(event) =>
                              updateProfile(
                                profile.id,
                                "username",
                                event.target.value
                              )
                            }
                            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${profile.id}-password`}
                            className="mb-1 block text-sm font-medium"
                          >
                            Password
                          </label>
                          <input
                            id={`${profile.id}-password`}
                            aria-label="Proxy password"
                            type="password"
                            value={profile.password}
                            onChange={(event) =>
                              updateProfile(
                                profile.id,
                                "password",
                                event.target.value
                              )
                            }
                            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                      <div>
                        <p className="text-sm font-medium">Auto rotate credentials</p>
                        <p className="text-xs text-gray-300">
                          Rotate secrets on every session for OPSEC-sensitive work.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={profile.autoRotate}
                        onChange={(checked) =>
                          updateProfile(profile.id, "autoRotate", checked)
                        }
                        ariaLabel={`Toggle auto rotation for ${profile.name}`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`${profile.id}-notes`}
                        className="mb-1 block text-sm font-medium"
                      >
                        Notes
                      </label>
                      <textarea
                        id={`${profile.id}-notes`}
                        aria-label="Profile notes"
                        value={profile.notes}
                        onChange={(event) =>
                          updateProfile(profile.id, "notes", event.target.value)
                        }
                        className="min-h-[90px] w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                      />
                    </div>
                  </section>
                ))}
              </div>
              <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-300">
                  Profiles are stored locally for simulation only. No outbound
                  requests are sent.
                </p>
                <button
                  type="button"
                  onClick={addProfile}
                  className="rounded bg-ub-orange px-4 py-2 font-semibold text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                >
                  Add profile
                </button>
              </div>
            </form>
          )}

          {activeTab === "chains" && (
            <div className="flex flex-col gap-6 lg:flex-row">
              <aside className="lg:w-1/3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Configured chains</h2>
                  <button
                    type="button"
                    onClick={addChain}
                    className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  >
                    Add chain
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {chains.map((chain) => (
                    <li key={chain.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedChainId(chain.id)}
                        className={`w-full rounded border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                          chain.id === selectedChain?.id
                            ? "border-ub-orange bg-gray-800"
                            : "border-gray-700 bg-gray-900/60 hover:border-ub-orange"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{chain.name}</span>
                          <span className="text-xs uppercase text-gray-400">
                            {chain.hops.length} hop{chain.hops.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-300">
                          {chain.description}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <section className="flex-1 rounded-lg border border-gray-700 bg-gray-900/70 p-4">
                {selectedChain ? (
                  <form
                    onSubmit={(event) => event.preventDefault()}
                    className="space-y-5"
                    aria-labelledby="chain-editor-heading"
                  >
                    <div>
                      <h2
                        id="chain-editor-heading"
                        className="text-lg font-semibold"
                      >
                        {selectedChain.name}
                      </h2>
                      <p className="text-sm text-gray-300">
                        Adjust hop order, balancing, and failover behaviour for
                        this simulated route.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor="chain-name"
                          className="mb-1 block text-sm font-medium"
                        >
                          Display name
                        </label>
                        <input
                          id="chain-name"
                          aria-label="Chain display name"
                          value={selectedChain.name}
                          onChange={(event) =>
                            updateChain(
                              selectedChain.id,
                              "name",
                              event.target.value
                            )
                          }
                          className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chain-description"
                          className="mb-1 block text-sm font-medium"
                        >
                          Summary
                        </label>
                        <textarea
                          id="chain-description"
                          aria-label="Chain summary"
                          value={selectedChain.description}
                          onChange={(event) =>
                            updateChain(
                              selectedChain.id,
                              "description",
                              event.target.value
                            )
                          }
                          className="min-h-[60px] w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-300">
                        Hop order
                      </h3>
                      <div className="mt-3 space-y-3">
                        {selectedChain.hops.map((hopId, index) => (
                          <div
                            key={`${selectedChain.id}-hop-${index}`}
                            className="flex flex-col gap-2 rounded border border-gray-700 bg-gray-800 p-3 md:flex-row md:items-center"
                          >
                            <label
                              htmlFor={`${selectedChain.id}-hop-${index}`}
                              className="text-sm font-medium"
                            >
                              Hop {index + 1}
                            </label>
                            <div className="flex flex-1 items-center gap-3">
                              <select
                                id={`${selectedChain.id}-hop-${index}`}
                                aria-label={`Hop ${index + 1}`}
                                value={hopId}
                                onChange={(event) =>
                                  updateChainHop(
                                    selectedChain.id,
                                    index,
                                    event.target.value
                                  )
                                }
                                className="flex-1 rounded border border-gray-600 bg-gray-900 p-2 text-white focus:border-orange-400 focus:outline-none"
                              >
                                {profiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.name} ({profile.protocol})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  removeHopFromChain(selectedChain.id, index)
                                }
                                className="rounded border border-gray-600 px-2 py-1 text-xs uppercase tracking-wide text-gray-200 transition hover:border-red-500 hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                                disabled={selectedChain.hops.length <= 1}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => addHopToChain(selectedChain.id)}
                        className="mt-3 rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                      >
                        Add hop
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                        <div>
                          <p className="text-sm font-medium">Enable chain</p>
                          <p className="text-xs text-gray-300">
                            Toggle availability in diagnostics and launchers.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={selectedChain.enabled}
                          onChange={(checked) =>
                            updateChain(selectedChain.id, "enabled", checked)
                          }
                          ariaLabel={`Toggle ${selectedChain.name}`}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                        <div>
                          <p className="text-sm font-medium">Load balance hops</p>
                          <p className="text-xs text-gray-300">
                            Distribute requests evenly across enabled proxies.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={selectedChain.loadBalance}
                          onChange={(checked) =>
                            updateChain(selectedChain.id, "loadBalance", checked)
                          }
                          ariaLabel={`Toggle load balancing for ${selectedChain.name}`}
                        />
                      </div>
                      <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                        <div>
                          <p className="text-sm font-medium">Failover routing</p>
                          <p className="text-xs text-gray-300">
                            Automatically skip disabled hops during testing.
                          </p>
                        </div>
                        <ToggleSwitch
                          checked={selectedChain.allowFailover}
                          onChange={(checked) =>
                            updateChain(
                              selectedChain.id,
                              "allowFailover",
                              checked
                            )
                          }
                          ariaLabel={`Toggle failover for ${selectedChain.name}`}
                        />
                      </div>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-gray-300">
                    Create a proxy chain to configure hop ordering and
                    redundancy.
                  </p>
                )}
              </section>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <form
              onSubmit={(event) => event.preventDefault()}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="diagnostics-target"
                    className="mb-1 block text-sm font-medium"
                  >
                    Target URL
                  </label>
                  <input
                    id="diagnostics-target"
                    aria-label="Target URL"
                    value={diagnostics.targetUrl}
                    onChange={(event) =>
                      updateDiagnostics("targetUrl", event.target.value)
                    }
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                    placeholder="https://example.com/api"
                  />
                </div>
                <div>
                  <label
                    htmlFor="diagnostics-method"
                    className="mb-1 block text-sm font-medium"
                  >
                    HTTP method
                  </label>
                  <select
                    id="diagnostics-method"
                    aria-label="HTTP method"
                    value={diagnostics.method}
                    onChange={(event) =>
                      updateDiagnostics(
                        "method",
                        event.target.value as DiagnosticsState["method"]
                      )
                    }
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="diagnostics-chain"
                    className="mb-1 block text-sm font-medium"
                  >
                    Proxy chain
                  </label>
                  <select
                    id="diagnostics-chain"
                    aria-label="Proxy chain"
                    value={diagnostics.chainId}
                    onChange={(event) =>
                      updateDiagnostics("chainId", event.target.value)
                    }
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white focus:border-orange-400 focus:outline-none"
                  >
                    {chains
                      .filter(
                        (chain) => chain.enabled || chain.id === diagnostics.chainId
                      )
                      .map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.name}
                        </option>
                      ))}
                    <option value="">Direct route (no proxy)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Chain preview
                  </label>
                  <div className="rounded border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300">
                    {diagnostics.chainId
                      ? diagnosticsChain?.hops.map((hopId, index) => (
                            <span key={hopId}>
                              {profileLookup[hopId]?.name ?? "Unknown"}
                              {index < (diagnosticsChain?.hops.length ?? 0) - 1
                                ? " → "
                                : ""}
                            </span>
                          )) ?? "No hops defined"
                      : "Requests exit directly without proxying."}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium">Capture headers</p>
                    <p className="text-xs text-gray-300">
                      Store request and response headers for audit trails.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={diagnostics.includeHeaders}
                    onChange={(checked) =>
                      updateDiagnostics("includeHeaders", checked)
                    }
                    ariaLabel="Toggle header capture"
                  />
                </div>
                <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium">Packet capture</p>
                    <p className="text-xs text-gray-300">
                      Generate a mock PCAP for offline packet review.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={diagnostics.capturePackets}
                    onChange={(checked) =>
                      updateDiagnostics("capturePackets", checked)
                    }
                    ariaLabel="Toggle packet capture"
                  />
                </div>
                <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium">Trace route</p>
                    <p className="text-xs text-gray-300">
                      Simulate hop-by-hop latency analysis for the chain.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={diagnostics.runTraceroute}
                    onChange={(checked) =>
                      updateDiagnostics("runTraceroute", checked)
                    }
                    ariaLabel="Toggle traceroute simulation"
                  />
                </div>
                <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-800 p-3">
                  <div>
                    <p className="text-sm font-medium">Latency baseline</p>
                    <p className="text-xs text-gray-300">
                      Include synthetic latency metrics in the report output.
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={diagnostics.simulateLatency}
                    onChange={(checked) =>
                      updateDiagnostics("simulateLatency", checked)
                    }
                    ariaLabel="Toggle latency simulation"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-300">
                  Diagnostics run in a sandbox. No external network requests are
                  triggered.
                </p>
                <button
                  type="button"
                  onClick={runDiagnostics}
                  className="rounded bg-ub-orange px-4 py-2 font-semibold text-black transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                >
                  Run diagnostics
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-300">
                  Activity log
                </h3>
                <div className="mt-3 max-h-64 overflow-y-auto rounded border border-gray-700 bg-black/60 p-3">
                  {logEntries.map((entry, index) => (
                    <pre
                      key={index}
                      className="mb-2 whitespace-pre-wrap font-mono text-xs text-gray-200"
                    >
                      {entry}
                    </pre>
                  ))}
                  {logEntries.length === 0 && (
                    <p className="text-xs text-gray-400">
                      Run a diagnostic to populate the log.
                    </p>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
