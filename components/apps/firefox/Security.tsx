import React, { useMemo, useState } from 'react';

type IssueSeverity = 'high' | 'medium' | 'low' | 'info';

type DocumentationLink = {
  label: string;
  href: string;
};

type MixedContentEntry = {
  url: string;
  type: 'active' | 'passive';
  description?: string;
};

type InsecureForm = {
  action: string;
  description?: string;
  method?: string;
};

type CookieConfiguration = {
  name: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

type ThirdPartyScript = {
  url: string;
  hasIntegrity?: boolean;
  note?: string;
};

export type SecurityScenario = {
  title?: string;
  description?: string;
  url: string;
  csp?: string;
  mixedContent?: MixedContentEntry[];
  insecureForms?: InsecureForm[];
  cookies?: CookieConfiguration[];
  usesHsts?: boolean;
  certificateValid?: boolean;
  tlsVersion?: '1.0' | '1.1' | '1.2' | '1.3';
  allowXFrame?: boolean;
  crossOriginScripts?: ThirdPartyScript[];
};

type SecurityIssue = {
  id: string;
  severity: IssueSeverity;
  title: string;
  summary: string;
  remediation: string;
  documentation: DocumentationLink[];
  details?: string;
};

type ScenarioParseResult = {
  scenario: SecurityScenario | null;
  error: string | null;
};

const severityOrder: IssueSeverity[] = ['high', 'medium', 'low', 'info'];

const severityStyles: Record<IssueSeverity, string> = {
  high: 'border-red-500/40 bg-red-500/10 text-red-200',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  low: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
  info: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
};

const severityLabels: Record<IssueSeverity, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const DOC_LINKS = {
  csp: { label: 'MDN: Content Security Policy (CSP)', href: 'https://developer.mozilla.org/docs/Web/HTTP/CSP' },
  scriptSrc: {
    label: 'MDN: CSP script-src directive',
    href: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Content-Security-Policy/script-src',
  },
  mixedContent: {
    label: 'MDN: Mixed content reference',
    href: 'https://developer.mozilla.org/docs/Web/Security/Mixed_content',
  },
  hsts: {
    label: 'MDN: Strict-Transport-Security',
    href: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security',
  },
  https: {
    label: 'MDN: HTTPS explained',
    href: 'https://developer.mozilla.org/docs/Web/Security/Transport_Layer_Security',
  },
  tls: {
    label: 'Mozilla: TLS configuration guidelines',
    href: 'https://infosec.mozilla.org/guidelines/web_security#transport-layer-security-tls',
  },
  cookies: {
    label: 'MDN: Set-Cookie response header',
    href: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie',
  },
  forms: {
    label: 'MDN: Preventing insecure password flows',
    href: 'https://developer.mozilla.org/docs/Web/Security/Insecure_passwords',
  },
  sri: {
    label: 'MDN: Subresource Integrity (SRI)',
    href: 'https://developer.mozilla.org/docs/Web/Security/Subresource_Integrity',
  },
  frame: {
    label: 'MDN: X-Frame-Options header',
    href: 'https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Frame-Options',
  },
};

const validTlsVersions = new Set(['1.0', '1.1', '1.2', '1.3']);

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const getBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const normaliseMixedContent = (value: unknown): MixedContentEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const url = getString(record.url);
      if (!url) {
        return null;
      }
      const type = record.type === 'passive' ? 'passive' : 'active';
      return {
        url,
        type,
        description: getString(record.description),
      };
    })
    .filter(Boolean) as MixedContentEntry[];
};

const normaliseForms = (value: unknown): InsecureForm[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const action = getString(record.action);
      if (!action) {
        return null;
      }
      const method = getString(record.method);
      return {
        action,
        method,
        description: getString(record.description),
      };
    })
    .filter(Boolean) as InsecureForm[];
};

const normaliseCookies = (value: unknown): CookieConfiguration[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const name = getString(record.name);
      if (!name) {
        return null;
      }
      const sameSiteValue = getString(record.sameSite);
      const sameSite =
        sameSiteValue && ['Strict', 'Lax', 'None'].includes(sameSiteValue)
          ? (sameSiteValue as 'Strict' | 'Lax' | 'None')
          : undefined;
      return {
        name,
        secure: getBoolean(record.secure),
        httpOnly: getBoolean(record.httpOnly),
        sameSite,
      };
    })
    .filter(Boolean) as CookieConfiguration[];
};

const normaliseScripts = (value: unknown): ThirdPartyScript[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const url = getString(record.url);
      if (!url) {
        return null;
      }
      return {
        url,
        hasIntegrity: getBoolean(record.hasIntegrity),
        note: getString(record.note),
      };
    })
    .filter(Boolean) as ThirdPartyScript[];
};

const normaliseScenario = (value: Record<string, unknown>): SecurityScenario => {
  const tlsVersionRaw = getString(value.tlsVersion);
  return {
    title: getString(value.title),
    description: getString(value.description),
    url: getString(value.url) ?? 'https://example.com/',
    csp: getString(value.csp),
    mixedContent: normaliseMixedContent(value.mixedContent),
    insecureForms: normaliseForms(value.insecureForms),
    cookies: normaliseCookies(value.cookies),
    usesHsts: getBoolean(value.usesHsts),
    certificateValid: getBoolean(value.certificateValid),
    tlsVersion:
      tlsVersionRaw && validTlsVersions.has(tlsVersionRaw)
        ? (tlsVersionRaw as SecurityScenario['tlsVersion'])
        : undefined,
    allowXFrame: getBoolean(value.allowXFrame),
    crossOriginScripts: normaliseScripts(value.crossOriginScripts),
  };
};

const parseScenario = (text: string): ScenarioParseResult => {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        scenario: null,
        error: 'Scenario must be a JSON object.',
      };
    }
    const scenario = normaliseScenario(raw as Record<string, unknown>);
    return { scenario, error: null };
  } catch (error) {
    return {
      scenario: null,
      error: error instanceof Error ? error.message : 'Unable to parse scenario JSON.',
    };
  }
};

const formatListPreview = (items: string[], max = 3) => {
  if (items.length <= max) {
    return items.join(', ');
  }
  const visible = items.slice(0, max).join(', ');
  const remaining = items.length - max;
  return `${visible}, and ${remaining} more`;
};

const evaluateScenario = (scenario: SecurityScenario): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(scenario.url);
  } catch {
    issues.push({
      id: 'invalid-url',
      severity: 'medium',
      title: 'URL could not be parsed',
      summary: 'The provided URL is not valid. Security checks may be incomplete until a valid URL is supplied.',
      remediation: 'Double-check the URL format, including protocol and host name, before running evaluations.',
      documentation: [DOC_LINKS.https],
    });
  }

  if (parsedUrl && parsedUrl.protocol !== 'https:') {
    issues.push({
      id: 'insecure-transport',
      severity: 'high',
      title: 'Page is not served over HTTPS',
      summary: `The simulated page is delivered over ${parsedUrl.protocol.replace(':', '')}, which allows interception and tampering.`,
      remediation:
        'Serve the site over HTTPS with a valid certificate. Redirect HTTP traffic to HTTPS and enable HSTS to enforce secure transport.',
      documentation: [DOC_LINKS.https, DOC_LINKS.hsts],
    });
  }

  if (scenario.certificateValid === false) {
    issues.push({
      id: 'certificate-invalid',
      severity: 'high',
      title: 'TLS certificate failed validation',
      summary: 'The scenario marks the TLS certificate as invalid. Browsers will warn users or block access entirely.',
      remediation:
        'Renew or reissue the TLS certificate from a trusted CA and ensure the full certificate chain is installed correctly.',
      documentation: [DOC_LINKS.https, DOC_LINKS.tls],
    });
  }

  if (scenario.tlsVersion && (scenario.tlsVersion === '1.0' || scenario.tlsVersion === '1.1')) {
    issues.push({
      id: 'tls-version',
      severity: 'high',
      title: `Deprecated TLS version in use (TLS ${scenario.tlsVersion})`,
      summary:
        'Legacy TLS versions are vulnerable to known attacks. Modern browsers are removing support for TLS 1.0 and 1.1.',
      remediation: 'Upgrade the server to require TLS 1.2 or TLS 1.3 and disable deprecated cipher suites.',
      documentation: [DOC_LINKS.tls],
    });
  }

  const csp = scenario.csp?.trim();
  if (!csp) {
    issues.push({
      id: 'missing-csp',
      severity: 'medium',
      title: 'Content Security Policy is missing',
      summary:
        'No Content Security Policy was supplied. Without CSP, browsers cannot restrict script, style, or frame sources.',
      remediation:
        "Add a Content-Security-Policy response header that defines at least a default-src directive and tightens script, style, and frame sources.",
      documentation: [DOC_LINKS.csp],
    });
  } else {
    if (!/default-src/i.test(csp)) {
      issues.push({
        id: 'csp-missing-default',
        severity: 'medium',
        title: 'CSP is missing a default-src directive',
        summary:
          'The supplied CSP does not define default-src. Browsers fall back to a permissive allowlist, which leaves gaps in coverage.',
        remediation: "Define default-src and override specific directives as needed (for example script-src and img-src).",
        documentation: [DOC_LINKS.csp],
      });
    }

    if (/'unsafe-inline'/.test(csp)) {
      issues.push({
        id: 'csp-unsafe-inline',
        severity: 'medium',
        title: "CSP allows 'unsafe-inline' scripts or styles",
        summary:
          "Allowing 'unsafe-inline' defeats most of CSP's protection against XSS because inline scripts and event handlers can run unchecked.",
        remediation:
          'Remove unsafe-inline and migrate inline scripts to external files or use nonces/hashes so trusted inline code can execute safely.',
        documentation: [DOC_LINKS.scriptSrc, DOC_LINKS.csp],
      });
    }

    if (/'unsafe-eval'/.test(csp)) {
      issues.push({
        id: 'csp-unsafe-eval',
        severity: 'medium',
        title: "CSP allows 'unsafe-eval'",
        summary: 'Allowing eval() and similar string-to-code APIs increases the risk of script injection.',
        remediation: 'Remove unsafe-eval and refactor code to avoid eval(), new Function(), or setTimeout(string) patterns.',
        documentation: [DOC_LINKS.scriptSrc],
      });
    }

    if (/(script-src|default-src)[^;]*http:/.test(csp)) {
      issues.push({
        id: 'csp-insecure-script-src',
        severity: 'high',
        title: 'CSP permits script execution over HTTP',
        summary:
          'The CSP allows scripts to load from http:// origins. Active content loaded over HTTP can be modified by an attacker.',
        remediation: 'Restrict script-src to HTTPS origins or trusted hostnames. Avoid wildcard or HTTP sources.',
        documentation: [DOC_LINKS.scriptSrc, DOC_LINKS.mixedContent],
      });
    }
  }

  const mixedContent = scenario.mixedContent ?? [];
  if (mixedContent.length > 0) {
    const activeMixed = mixedContent.filter((item) => item.type !== 'passive');
    const passiveMixed = mixedContent.filter((item) => item.type === 'passive');

    if (activeMixed.length > 0) {
      issues.push({
        id: 'mixed-content-active',
        severity: 'high',
        title: 'Active mixed content detected',
        summary: `The page references ${activeMixed.length} active resource${
          activeMixed.length === 1 ? '' : 's'
        } over HTTP, including ${formatListPreview(activeMixed.map((item) => item.url))}.`,
        remediation:
          'Serve scripts, XHR, and other active resources over HTTPS. Alternatively remove insecure resources or rewrite URLs via upgrade-insecure-requests.',
        documentation: [DOC_LINKS.mixedContent],
        details: activeMixed
          .map((entry) => `• ${entry.url}${entry.description ? ` — ${entry.description}` : ''}`)
          .join('\n'),
      });
    }

    if (passiveMixed.length > 0) {
      issues.push({
        id: 'mixed-content-passive',
        severity: 'medium',
        title: 'Passive mixed content detected',
        summary: `The scenario includes ${passiveMixed.length} passive asset${
          passiveMixed.length === 1 ? '' : 's'
        } over HTTP (for example images or video).`,
        remediation:
          'Host passive resources on HTTPS endpoints to avoid user-facing warnings and blocking in modern browsers.',
        documentation: [DOC_LINKS.mixedContent],
        details: passiveMixed
          .map((entry) => `• ${entry.url}${entry.description ? ` — ${entry.description}` : ''}`)
          .join('\n'),
      });
    }
  }

  if (scenario.insecureForms && scenario.insecureForms.length > 0) {
    issues.push({
      id: 'insecure-forms',
      severity: 'medium',
      title: 'Forms submit over insecure transport',
      summary: `Detected ${scenario.insecureForms.length} form submission${
        scenario.insecureForms.length === 1 ? '' : 's'
      } that target HTTP endpoints.`,
      remediation: 'Ensure login and sensitive forms post to HTTPS endpoints and consider setting autocomplete and password rules.',
      documentation: [DOC_LINKS.forms, DOC_LINKS.https],
      details: scenario.insecureForms
        .map((form) => `• ${form.method?.toUpperCase() ?? 'POST'} → ${form.action}${form.description ? ` — ${form.description}` : ''}`)
        .join('\n'),
    });
  }

  if (scenario.cookies && scenario.cookies.length > 0) {
    const insecureCookies = scenario.cookies.filter((cookie) => cookie.secure === false);
    const noHttpOnly = scenario.cookies.filter((cookie) => cookie.httpOnly === false);
    const laxSameSite = scenario.cookies.filter(
      (cookie) => cookie.sameSite === 'None' && cookie.secure !== true
    );

    if (insecureCookies.length > 0 || noHttpOnly.length > 0 || laxSameSite.length > 0) {
      const summaryParts: string[] = [];
      if (insecureCookies.length > 0) {
        summaryParts.push(
          `${insecureCookies.length} cookie${insecureCookies.length === 1 ? '' : 's'} without the Secure attribute`
        );
      }
      if (noHttpOnly.length > 0) {
        summaryParts.push(
          `${noHttpOnly.length} cookie${noHttpOnly.length === 1 ? '' : 's'} missing HttpOnly`
        );
      }
      if (laxSameSite.length > 0) {
        summaryParts.push(
          `${laxSameSite.length} cookie${laxSameSite.length === 1 ? '' : 's'} use SameSite=None without Secure`
        );
      }

      issues.push({
        id: 'cookie-configuration',
        severity: 'medium',
        title: 'Cookies are not hardened',
        summary: summaryParts.join('; '),
        remediation:
          'Mark session cookies as Secure and HttpOnly, and pair SameSite=None with Secure. Consider SameSite=Lax or Strict when possible.',
        documentation: [DOC_LINKS.cookies],
        details: scenario.cookies
          .map(
            (cookie) =>
              `• ${cookie.name} — Secure: ${cookie.secure === false ? 'no' : 'yes'}; HttpOnly: ${
                cookie.httpOnly === false ? 'no' : 'yes'
              }; SameSite: ${cookie.sameSite ?? 'unspecified'}`
          )
          .join('\n'),
      });
    }
  }

  if (scenario.usesHsts === false) {
    issues.push({
      id: 'missing-hsts',
      severity: 'medium',
      title: 'HSTS header is not enabled',
      summary: 'Strict-Transport-Security is disabled. Users can be downgraded to HTTP via protocol stripping attacks.',
      remediation: 'Send the Strict-Transport-Security header with an appropriate max-age and includeSubDomains/preload when ready.',
      documentation: [DOC_LINKS.hsts],
    });
  }

  if (scenario.allowXFrame === true) {
    issues.push({
      id: 'missing-frame-protection',
      severity: 'low',
      title: 'Framing protection disabled',
      summary: 'The scenario allows the page to be embedded in iframes. This increases clickjacking risk.',
      remediation: 'Return the X-Frame-Options DENY/SAMEORIGIN header or frame-ancestors CSP directive to control embedding.',
      documentation: [DOC_LINKS.frame, DOC_LINKS.csp],
    });
  }

  if (scenario.crossOriginScripts && scenario.crossOriginScripts.length > 0) {
    const missingIntegrity = scenario.crossOriginScripts.filter((script) => script.hasIntegrity === false);
    if (missingIntegrity.length > 0) {
      issues.push({
        id: 'missing-sri',
        severity: 'low',
        title: 'Third-party scripts lack Subresource Integrity',
        summary: `Detected ${missingIntegrity.length} cross-origin script${
          missingIntegrity.length === 1 ? '' : 's'
        } without integrity attributes.`,
        remediation: 'Add integrity and crossorigin attributes to third-party scripts to guard against supply-chain compromise.',
        documentation: [DOC_LINKS.sri],
        details: missingIntegrity
          .map((script) => `• ${script.url}${script.note ? ` — ${script.note}` : ''}`)
          .join('\n'),
      });
    }
  }

  issues.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));

  return issues;
};

const DEFAULT_SCENARIO: SecurityScenario = {
  title: 'Legacy blog with insecure embeds',
  description:
    'Simulates a marketing blog served over HTTPS but still pulling legacy HTTP assets and permissive CSP rules.',
  url: 'https://example.com/',
  csp: "default-src 'self'; img-src https: data:; script-src 'self' 'unsafe-inline' http://analytics.example.net",
  mixedContent: [
    {
      url: 'http://cdn.example.com/app.js',
      type: 'active',
      description: 'Main bundle fetched over HTTP',
    },
    {
      url: 'http://images.example.com/banner.jpg',
      type: 'passive',
      description: 'Hero banner image',
    },
  ],
  insecureForms: [
    {
      action: 'http://example.com/login',
      method: 'post',
      description: 'Legacy login endpoint still on HTTP',
    },
  ],
  cookies: [
    { name: 'sessionid', secure: false, httpOnly: true, sameSite: 'None' },
    { name: 'preferences', secure: false, httpOnly: false, sameSite: 'Lax' },
  ],
  usesHsts: false,
  certificateValid: true,
  tlsVersion: '1.0',
  allowXFrame: true,
  crossOriginScripts: [
    { url: 'https://third-party.example.net/widget.js', hasIntegrity: false, note: 'Embedded reviews widget' },
  ],
};

const SCENARIO_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  scenario: SecurityScenario;
}> = [
  {
    id: 'legacy-blog',
    label: 'Legacy blog (many warnings)',
    description: 'Highlights multiple red flags including mixed content, weak CSP, and insecure cookies.',
    scenario: DEFAULT_SCENARIO,
  },
  {
    id: 'locked-down-saas',
    label: 'Locked-down SaaS app',
    description: 'Strong HTTPS posture with strict CSP and hardened cookies.',
    scenario: {
      title: 'Modern SaaS application',
      description: 'Represents an app with a hardened configuration and minimal warnings.',
      url: 'https://app.example.com/dashboard',
      csp:
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'nonce-r4nd0m'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'",
      mixedContent: [],
      insecureForms: [],
      cookies: [
        { name: 'session', secure: true, httpOnly: true, sameSite: 'Strict' },
        { name: 'csrf', secure: true, httpOnly: true, sameSite: 'Lax' },
      ],
      usesHsts: true,
      certificateValid: true,
      tlsVersion: '1.3',
      allowXFrame: false,
      crossOriginScripts: [
        { url: 'https://cdn.jsdelivr.net/npm/chart.js', hasIntegrity: true },
      ],
    },
  },
  {
    id: 'intranet-http',
    label: 'Legacy intranet (HTTP)',
    description: 'Shows common findings when an internal tool still runs over HTTP with no TLS hardening.',
    scenario: {
      title: 'Intranet portal still on HTTP',
      url: 'http://intranet.local/dashboard',
      csp: undefined,
      mixedContent: [],
      insecureForms: [
        { action: 'http://intranet.local/login', description: 'Credential form on HTTP', method: 'post' },
      ],
      cookies: [{ name: 'JSESSIONID', secure: false, httpOnly: false }],
      usesHsts: false,
      certificateValid: false,
      tlsVersion: '1.0',
      allowXFrame: true,
      crossOriginScripts: [],
    },
  },
];

const Security: React.FC = () => {
  const [scenarioText, setScenarioText] = useState(() => JSON.stringify(DEFAULT_SCENARIO, null, 2));
  const [activePresetId, setActivePresetId] = useState<string>('legacy-blog');

  const { scenario, error } = useMemo(() => parseScenario(scenarioText), [scenarioText]);
  const issues = useMemo(() => (scenario ? evaluateScenario(scenario) : []), [scenario]);

  const severityCounts = useMemo(
    () =>
      severityOrder.reduce(
        (acc, severity) => ({
          ...acc,
          [severity]: issues.filter((issue) => issue.severity === severity).length,
        }),
        { high: 0, medium: 0, low: 0, info: 0 } as Record<IssueSeverity, number>
      ),
    [issues]
  );

  const handlePresetLoad = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }
    setActivePresetId(presetId);
    setScenarioText(JSON.stringify(preset.scenario, null, 2));
  };

  const scenarioHeading = scenario?.title ?? 'Custom scenario';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-5">
        <h1 className="text-2xl font-semibold text-white">Firefox Security Inspector</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-300">
          Model Firefox&apos;s security warnings without leaving the portfolio. Feed in a simulated page configuration and
          immediately see CSP, mixed content, and transport issues with remediation guidance.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-6 py-6 lg:flex-row">
        <section className="flex flex-col gap-4 lg:w-1/2">
          <article className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Start with a preset</h2>
            <p className="mt-1 text-sm text-gray-400">
              Load a preset scenario and then tweak the JSON to match your page. Warnings update as you edit.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetLoad(preset.id)}
                  className={`rounded border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    activePresetId === preset.id
                      ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                      : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-blue-400 hover:text-blue-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-2 text-xs text-gray-500">
              {SCENARIO_PRESETS.map((preset) => (
                <li key={`${preset.id}-description`}>
                  <span className="font-medium text-gray-300">{preset.label}:</span> {preset.description}
                </li>
              ))}
            </ul>
          </article>
          <article className="flex-1 rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Scenario JSON</h2>
              <span className="text-xs text-gray-500">Fields validate automatically</span>
            </div>
            <label htmlFor="firefox-security-scenario" className="sr-only">
              Security scenario JSON
            </label>
            <textarea
              id="firefox-security-scenario"
              className="mt-3 h-72 w-full rounded border border-gray-700 bg-gray-950 p-3 font-mono text-xs text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={scenarioText}
              onChange={(event) => setScenarioText(event.target.value)}
              aria-label="Security scenario JSON"
              spellCheck={false}
            />
            {error ? (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            ) : (
              <p className="mt-3 text-xs text-gray-500">
                Supported keys: url, title, description, csp, mixedContent, insecureForms, cookies, usesHsts, certificateValid,
                tlsVersion, allowXFrame, crossOriginScripts.
              </p>
            )}
          </article>
        </section>
        <section className="flex flex-1 flex-col gap-4 lg:w-1/2">
          <article className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Scenario overview</h2>
            <p className="mt-1 text-sm text-gray-300">
              <span className="font-medium text-white">{scenarioHeading}</span>
              {scenario?.url ? ` · ${scenario.url}` : null}
            </p>
            {scenario?.description ? (
              <p className="mt-2 text-xs text-gray-400">{scenario.description}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
              {severityOrder.map((severity) => (
                <div
                  key={`severity-${severity}`}
                  className={`rounded border px-2 py-3 font-medium ${severityStyles[severity]}`}
                >
                  <div className="text-xs uppercase tracking-wide text-gray-300">{severityLabels[severity]}</div>
                  <div className="mt-1 text-lg text-white">{severityCounts[severity]}</div>
                </div>
              ))}
            </div>
            {issues.length === 0 && !error ? (
              <p className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                No warnings detected for this scenario. Double-check production settings and enable security headers in real
                deployments.
              </p>
            ) : null}
          </article>
          <article className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Security findings</h2>
            {error ? (
              <p className="mt-3 text-sm text-red-400">Fix the scenario JSON to view findings.</p>
            ) : issues.length === 0 ? (
              <p className="mt-3 text-sm text-gray-300">
                Provide additional details in the scenario to explore how Firefox surfaces security warnings.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {issues.map((issue) => (
                  <li key={issue.id} className={`rounded-lg border p-4 ${severityStyles[issue.severity]}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{issue.title}</h3>
                      <span className="rounded border border-current px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                        {severityLabels[issue.severity]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-200">{issue.summary}</p>
                    {issue.details ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-gray-300">
                        {issue.details}
                      </pre>
                    ) : null}
                    <div className="mt-3 rounded-md bg-gray-950/60 p-3 text-sm text-gray-200">
                      <h4 className="text-sm font-semibold text-white">Remediation tips</h4>
                      <p className="mt-1 text-xs text-gray-400">{issue.remediation}</p>
                      <ul className="mt-3 space-y-2 text-xs">
                        {issue.documentation.map((link) => (
                          <li key={link.href}>
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-blue-300 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                            >
                              {link.label} ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default Security;
