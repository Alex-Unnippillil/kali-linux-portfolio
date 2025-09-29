"use client";

import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import {
  OpenVpnFormValues,
  ParsedVpnProfile,
  VpnProfileType,
  WireGuardFormValues,
  decodeQrFile,
  parseOpenVpnForm,
  parseVpnQrPayload,
  parseWireGuardForm,
  persistVpnProfile,
  profileNeedsPassphrase,
} from "../../../../utils/vpn";

const initialWireGuard: WireGuardFormValues = {
  name: "",
  address: "",
  privateKey: "",
  dns: "",
  listenPort: "",
  peerPublicKey: "",
  peerEndpoint: "",
  peerAllowedIps: "0.0.0.0/0",
  peerPresharedKey: "",
  persistentKeepalive: "",
};

const initialOpenVpn: OpenVpnFormValues = {
  name: "",
  remote: "",
  port: "",
  proto: "udp",
  username: "",
  password: "",
  ca: "",
  cert: "",
  key: "",
  tlsAuth: "",
  extraConfig: "",
};

type WizardStep = "method" | "details" | "review";

type MethodChoice = VpnProfileType | "qr";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-lg font-semibold text-ubt-grey mb-3">{children}</h2>;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm text-ubt-grey mb-1">
      {children}
    </label>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ubt-blue ${props.className ?? ""}`.trim()}
    />
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ubt-blue ${props.className ?? ""}`.trim()}
    />
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col border-b border-ubt-cool-grey py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-ubt-grey">{label}</span>
      <span className="text-sm text-white break-words">{value}</span>
    </div>
  );
}

export default function VpnWizard() {
  const [step, setStep] = useState<WizardStep>("method");
  const [method, setMethod] = useState<MethodChoice | null>(null);
  const [wireGuardValues, setWireGuardValues] = useState<WireGuardFormValues>(initialWireGuard);
  const [openVpnValues, setOpenVpnValues] = useState<OpenVpnFormValues>(initialOpenVpn);
  const [parsedProfile, setParsedProfile] = useState<ParsedVpnProfile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const resetWizard = () => {
    setStep("method");
    setMethod(null);
    setParsedProfile(null);
    setStatus(null);
    setError(null);
    setWireGuardValues(initialWireGuard);
    setOpenVpnValues(initialOpenVpn);
  };

  const handleMethodSelect = (choice: MethodChoice) => {
    setMethod(choice);
    setStep("details");
    setParsedProfile(null);
    setStatus(null);
    setError(null);
  };

  const validateWireGuard = (values: WireGuardFormValues) => {
    if (!values.name.trim()) throw new Error("Profile name is required");
    if (!values.address.trim()) throw new Error("Interface address is required");
    if (!values.privateKey.trim()) throw new Error("Private key is required");
    if (!values.peerPublicKey.trim()) throw new Error("Peer public key is required");
    if (!values.peerAllowedIps.trim()) throw new Error("Allowed IPs are required");
  };

  const validateOpenVpn = (values: OpenVpnFormValues) => {
    if (!values.name.trim()) throw new Error("Profile name is required");
    if (!values.remote.trim()) throw new Error("Remote host is required");
  };

  const buildProfile = async () => {
    if (!method) return;
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (method === "wireguard") {
        validateWireGuard(wireGuardValues);
        const profile = parseWireGuardForm(wireGuardValues);
        setParsedProfile(profile);
        setStep("review");
      } else if (method === "openvpn") {
        validateOpenVpn(openVpnValues);
        const profile = parseOpenVpnForm(openVpnValues);
        setParsedProfile(profile);
        setStep("review");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse VPN configuration";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleQrFile = async (file: File) => {
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      const text = await decodeQrFile(file);
      const profile = parseVpnQrPayload(text);
      setParsedProfile(profile);
      setMethod(profile.type);
      setStep("review");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to decode QR code";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = async () => {
    if (!parsedProfile) return;
    setIsBusy(true);
    setError(null);
    setStatus(null);
    try {
      let passphrase: string | undefined;
      if (profileNeedsPassphrase(parsedProfile)) {
        if (typeof window === "undefined") {
          throw new Error("Passphrase prompt is only available in the browser");
        }
        const input = window.prompt("Enter a passphrase to encrypt VPN credentials (min 8 characters):");
        if (!input) throw new Error("Passphrase is required to store this profile");
        if (input.length < 8) throw new Error("Passphrase must be at least 8 characters long");
        passphrase = input;
      }
      await persistVpnProfile(parsedProfile, passphrase);
      setStatus(`Saved ${parsedProfile.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save VPN profile";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const renderMethodStep = () => (
    <div className="space-y-4">
      <SectionTitle>Select VPN profile type</SectionTitle>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { key: "wireguard", label: "WireGuard", description: "Create a WireGuard profile" },
          { key: "openvpn", label: "OpenVPN", description: "Create an OpenVPN profile" },
          { key: "qr", label: "Import from QR", description: "Scan a VPN configuration" },
        ].map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => handleMethodSelect(option.key as MethodChoice)}
            className="flex h-full flex-col rounded border border-ubt-cool-grey bg-ub-dark-grey p-4 text-left transition hover:border-ubt-blue"
          >
            <span className="text-base font-semibold text-white">{option.label}</span>
            <span className="mt-2 text-sm text-ubt-grey">{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderWireGuardForm = () => (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void buildProfile();
      }}
    >
      <SectionTitle>WireGuard interface</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="wg-name">Profile name</FieldLabel>
          <Input
            id="wg-name"
            value={wireGuardValues.name}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-address">Interface address</FieldLabel>
          <Input
            id="wg-address"
            placeholder="10.0.0.2/32"
            value={wireGuardValues.address}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, address: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-private-key">Private key</FieldLabel>
          <Input
            id="wg-private-key"
            value={wireGuardValues.privateKey}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, privateKey: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-dns">DNS servers</FieldLabel>
          <Input
            id="wg-dns"
            placeholder="1.1.1.1, 9.9.9.9"
            value={wireGuardValues.dns}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, dns: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-listen-port">Listen port</FieldLabel>
          <Input
            id="wg-listen-port"
            placeholder="51820"
            value={wireGuardValues.listenPort}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, listenPort: event.target.value }))
            }
          />
        </div>
      </div>

      <SectionTitle>Peer configuration</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="wg-peer-public">Peer public key</FieldLabel>
          <Input
            id="wg-peer-public"
            value={wireGuardValues.peerPublicKey}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, peerPublicKey: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-endpoint">Endpoint</FieldLabel>
          <Input
            id="wg-endpoint"
            placeholder="vpn.example.com:51820"
            value={wireGuardValues.peerEndpoint}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, peerEndpoint: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-allowed">Allowed IPs</FieldLabel>
          <Input
            id="wg-allowed"
            placeholder="0.0.0.0/0, ::/0"
            value={wireGuardValues.peerAllowedIps}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, peerAllowedIps: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-preshared">Preshared key</FieldLabel>
          <Input
            id="wg-preshared"
            value={wireGuardValues.peerPresharedKey}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, peerPresharedKey: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="wg-keepalive">Persistent keepalive</FieldLabel>
          <Input
            id="wg-keepalive"
            placeholder="25"
            value={wireGuardValues.persistentKeepalive}
            onChange={(event) =>
              setWireGuardValues((prev) => ({ ...prev, persistentKeepalive: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={resetWizard}
          className="rounded border border-ubt-cool-grey px-4 py-2 text-sm text-ubt-grey hover:border-ubt-blue hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </form>
  );

  const renderOpenVpnForm = () => (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void buildProfile();
      }}
    >
      <SectionTitle>OpenVPN client</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="ovpn-name">Profile name</FieldLabel>
          <Input
            id="ovpn-name"
            value={openVpnValues.name}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-remote">Remote host</FieldLabel>
          <Input
            id="ovpn-remote"
            placeholder="vpn.example.com"
            value={openVpnValues.remote}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, remote: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-port">Port</FieldLabel>
          <Input
            id="ovpn-port"
            placeholder="1194"
            value={openVpnValues.port}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, port: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-proto">Protocol</FieldLabel>
          <Input
            id="ovpn-proto"
            placeholder="udp"
            value={openVpnValues.proto}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, proto: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-username">Username</FieldLabel>
          <Input
            id="ovpn-username"
            value={openVpnValues.username}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, username: event.target.value }))
            }
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-password">Password</FieldLabel>
          <Input
            id="ovpn-password"
            type="password"
            value={openVpnValues.password}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, password: event.target.value }))
            }
          />
        </div>
      </div>
      <SectionTitle>Certificates and advanced options</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <FieldLabel htmlFor="ovpn-ca">CA certificate path</FieldLabel>
          <Input
            id="ovpn-ca"
            value={openVpnValues.ca}
            onChange={(event) => setOpenVpnValues((prev) => ({ ...prev, ca: event.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-cert">Client certificate path</FieldLabel>
          <Input
            id="ovpn-cert"
            value={openVpnValues.cert}
            onChange={(event) => setOpenVpnValues((prev) => ({ ...prev, cert: event.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-key">Client key path</FieldLabel>
          <Input
            id="ovpn-key"
            value={openVpnValues.key}
            onChange={(event) => setOpenVpnValues((prev) => ({ ...prev, key: event.target.value }))}
          />
        </div>
        <div>
          <FieldLabel htmlFor="ovpn-tls">TLS auth key</FieldLabel>
          <Input
            id="ovpn-tls"
            value={openVpnValues.tlsAuth}
            onChange={(event) =>
              setOpenVpnValues((prev) => ({ ...prev, tlsAuth: event.target.value }))
            }
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="ovpn-extra">Extra directives</FieldLabel>
        <Textarea
          id="ovpn-extra"
          rows={4}
          placeholder="push "redirect-gateway"\nremote-cert-tls server"
          value={openVpnValues.extraConfig}
          onChange={(event) =>
            setOpenVpnValues((prev) => ({ ...prev, extraConfig: event.target.value }))
          }
        />
      </div>
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={resetWizard}
          className="rounded border border-ubt-cool-grey px-4 py-2 text-sm text-ubt-grey hover:border-ubt-blue hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isBusy}
          className="rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </form>
  );

  const renderQrStep = () => (
    <div className="space-y-4">
      <SectionTitle>Import VPN profile from QR</SectionTitle>
      <p className="text-sm text-ubt-grey">
        Upload a PNG or JPEG image containing a WireGuard or OpenVPN configuration QR code. The wizard
        will decode the QR content and map it to a NetworkManager connection.
      </p>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Upload VPN QR image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleQrFile(file);
        }}
        className="text-sm text-ubt-grey"
      />
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={resetWizard}
          className="rounded border border-ubt-cool-grey px-4 py-2 text-sm text-ubt-grey hover:border-ubt-blue hover:text-white"
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      {parsedProfile && (
        <>
          <SectionTitle>Review profile</SectionTitle>
          <div className="rounded border border-ubt-cool-grey bg-ub-dark-grey p-4">
            <SummaryRow label="Name" value={parsedProfile.name} />
            <SummaryRow label="Type" value={parsedProfile.type.toUpperCase()} />
            <SummaryRow
              label="Autoconnect"
              value={parsedProfile.nmConnection.connection.autoconnect ? "Enabled" : "Disabled"}
            />
            {parsedProfile.nmConnection.vpn && (
              <SummaryRow
                label="VPN settings"
                value={<pre className="whitespace-pre-wrap text-xs text-ubt-grey">{JSON.stringify(parsedProfile.nmConnection.vpn.data, null, 2)}</pre>}
              />
            )}
            {parsedProfile.nmConnection.wireguard && (
              <SummaryRow
                label="WireGuard"
                value={<pre className="whitespace-pre-wrap text-xs text-ubt-grey">{JSON.stringify(parsedProfile.nmConnection.wireguard_peer, null, 2)}</pre>}
              />
            )}
            <SummaryRow
              label="Secrets stored"
              value={profileNeedsPassphrase(parsedProfile) ? "Yes (requires passphrase)" : "No"}
            />
          </div>
          {parsedProfile.warnings.length > 0 && (
            <div className="rounded border border-yellow-700 bg-yellow-900/40 p-3 text-sm text-yellow-200">
              <p className="font-semibold">Warnings</p>
              <ul className="list-disc pl-5">
                {parsedProfile.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => setStep(method ? "details" : "method")}
          className="rounded border border-ubt-cool-grey px-4 py-2 text-sm text-ubt-grey hover:border-ubt-blue hover:text-white"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {status && <span className="text-sm text-green-300">{status}</span>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isBusy}
            className="rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save profile
          </button>
        </div>
      </div>
    </div>
  );

  const stepNumber = step === "method" ? 1 : step === "review" ? 3 : 2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">VPN Profile Wizard</h1>
        <span className="text-sm text-ubt-grey">Step {stepNumber} of 3</span>
      </div>
      {error && (
        <div className="rounded border border-red-700 bg-red-900/40 p-3 text-sm text-red-200">{error}</div>
      )}
      {step === "method" && renderMethodStep()}
      {step === "details" && method === "wireguard" && renderWireGuardForm()}
      {step === "details" && method === "openvpn" && renderOpenVpnForm()}
      {step === "details" && method === "qr" && renderQrStep()}
      {step === "review" && renderReview()}
    </div>
  );
}
