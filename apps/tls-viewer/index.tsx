import React, { useMemo, useState } from 'react';

interface ParsedTLS {
  protocol?: string;
  cipher?: string;
  groups: string[];
  alpn?: string;
  ocsp?: string;
  hsts?: string;
  advice: string[];
  sanDns: string[];
  subjectCn?: string;
}

const cipherMap: Record<number, string> = {
  4865: 'TLS_AES_128_GCM_SHA256',
  4866: 'TLS_AES_256_GCM_SHA384',
  4867: 'TLS_CHACHA20_POLY1305_SHA256',
  49195: 'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
  49196: 'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
  52393: 'TLS_AES_128_CCM_SHA256',
  52392: 'TLS_CHACHA20_POLY1305_SHA256',
};

const groupMap: Record<number, string> = {
  29: 'X25519',
  23: 'secp256r1',
  24: 'secp384r1',
  25: 'secp521r1',
  256: 'ffdhe2048',
  257: 'ffdhe3072',
  258: 'ffdhe4096',
  259: 'ffdhe6144',
  260: 'ffdhe8192',
};

const versionMap: Record<number, string> = {
  769: 'TLS 1.0',
  770: 'TLS 1.1',
  771: 'TLS 1.2',
  772: 'TLS 1.3',
};

function mapCipher(num: number) {
  return cipherMap[num] || `0x${num.toString(16)}`;
}

function mapGroup(num: number) {
  return groupMap[num] || `0x${num.toString(16)}`;
}

function parseJA3(input: string): ParsedTLS {
  const raw = input.trim().replace(/^ja3=|^ja3s=/i, '');
  const parts = raw.split(',');
  const result: ParsedTLS = { groups: [], advice: [], sanDns: [] };
  if (parts.length >= 5) {
    const version = parseInt(parts[0], 10);
    result.protocol = versionMap[version] || String(version);
    const cipherNums = parts[1]
      .split('-')
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n));
    result.cipher = cipherNums.map(mapCipher).join(', ');
    const groupNums = parts[3]
      .split('-')
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n));
    result.groups = groupNums.map(mapGroup);

    if (version < 772) {
      result.advice.push('Enable TLS 1.3 for stronger security and performance.');
    }
    if (!groupNums.includes(29) && !groupNums.includes(23)) {
      result.advice.push('Offer modern ECDHE groups such as X25519 or secp256r1.');
    }
  }
  return result;
}

function parseSClient(input: string): ParsedTLS {
  const result: ParsedTLS = { groups: [], advice: [], sanDns: [] };
  const protocolMatch = input.match(/Protocol\s*:\s*([^\n]+)/i);
  if (protocolMatch) {
    result.protocol = protocolMatch[1].trim();
    if (!/TLSv1\.3/.test(result.protocol)) {
      result.advice.push('Upgrade to TLS 1.3.');
    }
  }

  const cipherMatch = input.match(/Cipher\s*:?\s*([^\n]+)/i);
  if (cipherMatch) {
    result.cipher = cipherMatch[1].trim();
    if (/RC4|DES|CBC|MD5|NULL/i.test(result.cipher)) {
      result.advice.push('Avoid legacy ciphers; use AES-GCM or ChaCha20.');
    }
  }

  const groupMatches = Array.from(input.matchAll(/Server Temp Key:\s*([^,\n]+)/gi));
  if (groupMatches.length > 0) {
    result.groups = groupMatches.map((m) => m[1].trim());
    const hasModern = result.groups.some((g) => /X25519|P-256|secp256r1/i.test(g));
    if (!hasModern) {
      result.advice.push('Enable modern ECDHE groups like X25519 or P-256.');
    }
  }

  const alpnMatch = input.match(/ALPN protocol:\s*([^\n]+)/i);
  if (alpnMatch) {
    result.alpn = alpnMatch[1].trim();
    if (/http\/1\.1/i.test(result.alpn) && !/h2|h3/i.test(result.alpn)) {
      result.advice.push('Enable HTTP/2 or HTTP/3 support through ALPN.');
    }
  } else {
    result.advice.push('Advertise ALPN protocols such as h2 for HTTP/2.');
  }

  const ocspMatch = input.match(/OCSP response:\s*([^\n]+)/i);
  if (ocspMatch) {
    result.ocsp = ocspMatch[1].trim();
    if (/no response/i.test(result.ocsp)) {
      result.advice.push('Enable OCSP stapling.');
    }
  } else {
    result.advice.push('Enable OCSP stapling.');
  }

  const sanSectionMatch = input.match(/Subject Alternative Name:\s*([\s\S]*?)(?:\n\s*[A-Z0-9-]+:?|\n\n|$)/i);
  if (sanSectionMatch) {
    const sanBlock = sanSectionMatch[1];
    const dnsMatches = Array.from(sanBlock.matchAll(/DNS:([^,\n]+)/gi)).map((m) => m[1].trim());
    if (dnsMatches.length > 0) {
      result.sanDns = dnsMatches;
    }
  }

  const subjectLineMatch = input.match(/Server certificate[\s\S]*?subject\s*=\s*([^\n]+)/i) || input.match(/subject\s*=\s*([^\n]+)/i);
  if (subjectLineMatch) {
    const cnMatch = subjectLineMatch[1].match(/CN\s*=\s*([^,\/]+)/i);
    if (cnMatch) {
      result.subjectCn = cnMatch[1].trim();
    }
  }

  const hstsMatch = input.match(/Strict-Transport-Security:\s*([^\n]+)/i);
  if (hstsMatch) {
    result.hsts = hstsMatch[1].trim();
    const maxAgeMatch = result.hsts.match(/max-age\s*=\s*(\d+)/i);
    if (maxAgeMatch && parseInt(maxAgeMatch[1], 10) < 31536000) {
      result.advice.push('Increase HSTS max-age to at least one year.');
    }
  } else {
    result.advice.push('Enable HSTS to enforce HTTPS.');
  }

  return result;
}

function parseInput(input: string): ParsedTLS {
  if (/^ja3(?:s)?=/i.test(input.trim()) || /^\d+,\d+(?:-\d+)*,/.test(input.trim())) {
    return parseJA3(input);
  }
  return parseSClient(input);
}

const matchesHostname = (pattern: string, host: string) => {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedPattern || !normalizedHost) return false;
  if (normalizedPattern === normalizedHost) return true;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(1);
    if (!normalizedHost.endsWith(suffix)) return false;
    const remainder = normalizedHost.slice(0, normalizedHost.length - suffix.length);
    return remainder.length > 0 && !remainder.includes('.');
  }
  return false;
};

const TLSViewer: React.FC = () => {
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ParsedTLS | null>(null);
  const [expectedHost, setExpectedHost] = useState('');

  const handleParse = () => {
    if (!raw.trim()) return;
    setParsed(parseInput(raw));
  };

  const hostnameWarnings = useMemo(() => {
    if (!parsed) return [] as string[];
    const host = expectedHost.trim();
    if (!host) return [] as string[];

    const lowerHost = host.toLowerCase();
    const warnings: string[] = [];
    const sanEntries = parsed.sanDns ?? [];

    if (sanEntries.length > 0) {
      const sanMatch = sanEntries.some((entry) => matchesHostname(entry, lowerHost));
      if (!sanMatch) {
        warnings.push(
          `SAN DNS mismatch: ${host} is not covered by ${sanEntries.join(', ')}`,
        );
      }
    } else {
      warnings.push('Certificate has no SAN DNS entries. Modern clients require SAN entries for hostname validation.');
    }

    if (parsed.subjectCn) {
      if (!matchesHostname(parsed.subjectCn, lowerHost)) {
        warnings.push(`Legacy CN mismatch: certificate CN ${parsed.subjectCn} does not match ${host}.`);
      }
    } else {
      warnings.push('Certificate is missing a Common Name subject attribute.');
    }

    return warnings;
  }, [expectedHost, parsed]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4 overflow-auto">
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Paste openssl s_client output or JA3 string"
        className="flex-1 p-2 text-black"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <button
          type="button"
          onClick={handleParse}
          className="px-4 py-2 bg-blue-600 rounded w-32"
        >
          Parse
        </button>
        <div className="flex flex-col">
          <label htmlFor="expected-hostname" className="text-xs uppercase tracking-wide text-gray-300">
            Expected Hostname
          </label>
          <input
            id="expected-hostname"
            type="text"
            value={expectedHost}
            onChange={(e) => setExpectedHost(e.target.value)}
            placeholder="e.g. www.example.com"
            className="p-2 text-black rounded"
          />
        </div>
      </div>
      {hostnameWarnings.length > 0 && (
        <div
          role="alert"
          className="bg-red-900 border border-red-700 text-red-200 p-3 rounded space-y-1"
        >
          <p className="font-semibold">Hostname validation failed</p>
          <ul className="list-disc list-inside text-sm space-y-1">
            {hostnameWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {parsed && (
        <div className="space-y-2 text-sm">
          <div>
            <strong>Protocol:</strong> {parsed.protocol || 'Unknown'}
          </div>
          <div>
            <strong>Cipher:</strong> {parsed.cipher || 'Unknown'}
          </div>
          <div>
            <strong>Groups:</strong> {parsed.groups.length > 0 ? parsed.groups.join(', ') : 'Unknown'}
          </div>
          <div>
            <strong>ALPN:</strong> {parsed.alpn || 'None'}
          </div>
          <div>
            <strong>OCSP:</strong> {parsed.ocsp || 'Unknown'}
          </div>
          <div>
            <strong>HSTS:</strong> {parsed.hsts || 'Not Detected'}
          </div>
          <div>
            <strong>Common Name (CN):</strong> {parsed.subjectCn || 'Not Found'}
          </div>
          <div>
            <strong>SAN DNS:</strong> {parsed.sanDns.length > 0 ? parsed.sanDns.join(', ') : 'None'}
          </div>
          {parsed.advice.length > 0 && (
            <div className="pt-2">
              <strong>Upgrade Advice:</strong>
              <ul className="list-disc list-inside">
                {parsed.advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TLSViewer;

