import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

type ArgPrimitive = string | number | boolean;

type ArgType = 'string' | 'number' | 'boolean' | 'select';

interface ArgOption {
  label: string;
  value: string;
}

interface ArgDefinition {
  key: string;
  label: string;
  type: ArgType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: ArgPrimitive;
  min?: number;
  max?: number;
  step?: number;
  options?: ArgOption[];
  dependsOn?: {
    key: string;
    values: ArgPrimitive[];
    message?: string;
  };
}

export type ScriptArgValues = Record<string, ArgPrimitive>;

type ValidationRule = (values: ScriptArgValues) => string | null;

interface PlannerMetadata {
  summary: string;
  tags: string[];
}

interface ScriptMetadata {
  args: ArgDefinition[];
  presets?: Record<string, ScriptArgValues>;
  planner: PlannerMetadata;
  rules?: ValidationRule[];
}

export interface PlannerEntry {
  script: string;
  summary: string;
  tags: string[];
  args: ScriptArgValues;
}

export interface ScriptArgsChange {
  values: ScriptArgValues;
  errors: string[];
  isValid: boolean;
  planner: PlannerEntry | null;
}

const isPresetMap = (value: unknown): value is Record<string, ScriptArgValues> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return Object.values(value as Record<string, unknown>).every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }
    return true;
  });
};

export const scriptArgumentMetadata: Record<string, ScriptMetadata> = {
  'http-title': {
    planner: {
      summary: 'Profile HTTP services by collecting page titles.',
      tags: ['http', 'discovery'],
    },
    presets: {
      Baseline: {
        path: '/',
        https: false,
        maxLength: 80,
        statusOnly: false,
      },
      'Strict TLS': {
        path: '/',
        https: true,
        maxLength: 60,
        statusOnly: false,
      },
    },
    args: [
      {
        key: 'path',
        label: 'Request path',
        type: 'string',
        required: true,
        placeholder: '/index.html',
        defaultValue: '/',
        description: 'Relative path to request from the target HTTP service.',
      },
      {
        key: 'https',
        label: 'Force HTTPS',
        type: 'boolean',
        defaultValue: false,
        description: 'Upgrade the probe to HTTPS even when scanning a plain HTTP port.',
      },
      {
        key: 'maxLength',
        label: 'Max title length',
        type: 'number',
        min: 10,
        max: 200,
        step: 10,
        defaultValue: 80,
        description: 'Maximum number of characters to capture from the HTML <title>.',
      },
      {
        key: 'statusOnly',
        label: 'Status-only mode',
        type: 'boolean',
        defaultValue: false,
        description: 'Skip HTML parsing and only record the HTTP status line.',
      },
    ],
    rules: [
      (values) => {
        if (values.statusOnly && typeof values.maxLength === 'number' && values.maxLength > 80) {
          return 'Status-only mode streams only headers. Reduce the max title length to 80 characters or disable status-only.';
        }
        return null;
      },
      (values) => {
        if (values.https && typeof values.path === 'string' && values.path.startsWith('http')) {
          return 'Provide a relative request path when forcing HTTPS. Remove the scheme prefix (http:// or https://).';
        }
        return null;
      },
    ],
  },
  'ssl-cert': {
    planner: {
      summary: 'Collect TLS certificate metadata for crypto hygiene reviews.',
      tags: ['ssl', 'crypto'],
    },
    presets: {
      Baseline: {
        showExpired: false,
        showTrusted: true,
        minKeyBits: 2048,
        issuer: 'any',
      },
      'Legacy Inventory': {
        showExpired: true,
        showTrusted: false,
        minKeyBits: 1024,
        issuer: 'any',
      },
    },
    args: [
      {
        key: 'showExpired',
        label: 'Include expired certs',
        type: 'boolean',
        defaultValue: false,
        description: 'Display certificates that are past their validity period.',
      },
      {
        key: 'showTrusted',
        label: 'Only trusted issuers',
        type: 'boolean',
        defaultValue: true,
        description: 'Limit output to certificates chaining to trusted roots.',
      },
      {
        key: 'minKeyBits',
        label: 'Minimum key size',
        type: 'number',
        min: 512,
        max: 8192,
        step: 256,
        defaultValue: 2048,
        description: 'Discard results that negotiate keys weaker than this size.',
      },
      {
        key: 'issuer',
        label: 'Preferred issuer',
        type: 'select',
        defaultValue: 'any',
        options: [
          { label: 'Any', value: 'any' },
          { label: 'Let’s Encrypt', value: 'letsencrypt' },
          { label: 'DigiCert', value: 'digicert' },
          { label: 'Sectigo', value: 'sectigo' },
        ],
        description: 'Focus on certificates issued by a specific authority.',
      },
    ],
    rules: [
      (values) => {
        if (
          typeof values.minKeyBits === 'number' &&
          values.minKeyBits > 4096 &&
          values.issuer === 'any'
        ) {
          return 'A minimum key size above 4096 bits with any issuer selected will filter most findings. Reduce the threshold or pick an issuer.';
        }
        return null;
      },
    ],
  },
  'smb-os-discovery': {
    planner: {
      summary: 'Fingerprint SMB services to map operating systems.',
      tags: ['smb', 'host-discovery'],
    },
    presets: {
      Baseline: {
        useCache: true,
        maxAttempts: 3,
        workgroup: '',
      },
      'Impatient Sweep': {
        useCache: false,
        maxAttempts: 2,
        workgroup: '',
      },
    },
    args: [
      {
        key: 'useCache',
        label: 'Cache session info',
        type: 'boolean',
        defaultValue: true,
        description: 'Reuse negotiated sessions to speed up large scans.',
      },
      {
        key: 'maxAttempts',
        label: 'Max attempts',
        type: 'number',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
        description: 'Number of retries before a host is considered unresponsive.',
      },
      {
        key: 'workgroup',
        label: 'Workgroup hint',
        type: 'string',
        defaultValue: '',
        placeholder: 'CORP',
        description: 'Optional workgroup or domain name to seed the probe.',
      },
    ],
    rules: [
      (values) => {
        if (!values.useCache && typeof values.maxAttempts === 'number' && values.maxAttempts > 4) {
          return 'Disabling cache with more than 4 attempts can overwhelm legacy SMB stacks. Either enable caching or drop retries to 4 or fewer.';
        }
        return null;
      },
    ],
  },
  'ftp-anon': {
    planner: {
      summary: 'Check anonymous FTP posture and optional upload rights.',
      tags: ['ftp', 'auth'],
    },
    presets: {
      Baseline: {
        username: 'anonymous',
        timeout: 10,
        checkUpload: false,
      },
      'Upload Audit': {
        username: 'anonymous',
        timeout: 20,
        checkUpload: true,
      },
    },
    args: [
      {
        key: 'username',
        label: 'Login username',
        type: 'string',
        defaultValue: 'anonymous',
        placeholder: 'anonymous',
        description: 'User name supplied during the FTP handshake.',
      },
      {
        key: 'timeout',
        label: 'Timeout (s)',
        type: 'number',
        min: 5,
        max: 60,
        step: 1,
        defaultValue: 10,
        description: 'Maximum seconds to wait for banner and login responses.',
      },
      {
        key: 'checkUpload',
        label: 'Probe upload capability',
        type: 'boolean',
        defaultValue: false,
        description: 'Attempt a harmless upload to confirm write permissions.',
      },
    ],
    rules: [
      (values) => {
        if (values.checkUpload && values.username !== 'anonymous') {
          return 'Upload probing only supports the anonymous account in this demo. Switch the username back to "anonymous" or disable the upload check.';
        }
        return null;
      },
    ],
  },
  'http-enum': {
    planner: {
      summary: 'Enumerate web content and common application routes.',
      tags: ['http', 'content-enum'],
    },
    presets: {
      Baseline: {
        profile: 'common',
        maxDepth: 3,
        respectRobots: true,
      },
      'CMS Hunter': {
        profile: 'cms',
        maxDepth: 4,
        respectRobots: false,
      },
    },
    args: [
      {
        key: 'profile',
        label: 'Path profile',
        type: 'select',
        defaultValue: 'common',
        options: [
          { label: 'Common paths', value: 'common' },
          { label: 'CMS paths', value: 'cms' },
          { label: 'IoT firmware', value: 'iot' },
        ],
        description: 'Select a curated wordlist tailored to the target surface.',
      },
      {
        key: 'maxDepth',
        label: 'Recursion depth',
        type: 'number',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
        description: 'How deep to recurse into discovered directories.',
      },
      {
        key: 'respectRobots',
        label: 'Respect robots.txt',
        type: 'boolean',
        defaultValue: true,
        description: 'Skip paths disallowed by the site’s robots.txt.',
      },
      {
        key: 'testLoginFlows',
        label: 'Test login workflows',
        type: 'boolean',
        defaultValue: false,
        description: 'Replay lightweight login probes on detected admin panels.',
        dependsOn: {
          key: 'profile',
          values: ['cms'],
          message: 'Login replay is only available when the CMS profile is selected.',
        },
      },
    ],
    rules: [
      (values) => {
        if (values.profile === 'iot' && typeof values.maxDepth === 'number' && values.maxDepth > 4) {
          return 'The IoT profile ships with deeply nested paths already. Reduce recursion depth to 4 or less when using the IoT dictionary.';
        }
        return null;
      },
    ],
  },
  'dns-brute': {
    planner: {
      summary: 'Enumerate DNS subdomains using layered dictionaries.',
      tags: ['dns', 'brute'],
    },
    presets: {
      Baseline: {
        dictionary: 'small',
        threads: 10,
        wildcard: false,
      },
      'Wide Sweep': {
        dictionary: 'medium',
        threads: 15,
        wildcard: false,
      },
      'Depth Charge': {
        dictionary: 'huge',
        threads: 20,
        wildcard: true,
      },
    },
    args: [
      {
        key: 'dictionary',
        label: 'Dictionary size',
        type: 'select',
        defaultValue: 'small',
        options: [
          { label: 'Small (fast)', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Huge (slow)', value: 'huge' },
        ],
        description: 'Select the wordlist used for brute forcing subdomains.',
      },
      {
        key: 'threads',
        label: 'Concurrent lookups',
        type: 'number',
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 10,
        description: 'Number of parallel DNS queries issued at a time.',
      },
      {
        key: 'wildcard',
        label: 'Detect wildcard records',
        type: 'boolean',
        defaultValue: false,
        description: 'Run a control query to detect wildcard DNS responses.',
      },
      {
        key: 'pauseOnHit',
        label: 'Pause when a hit is found',
        type: 'boolean',
        defaultValue: false,
        description: 'Stop the run when a subdomain is discovered to review manually.',
        dependsOn: {
          key: 'wildcard',
          values: [false],
          message: 'Pause on hit is disabled when wildcard detection is active.',
        },
      },
    ],
    rules: [
      (values) => {
        if (values.dictionary === 'huge' && typeof values.threads === 'number' && values.threads > 25) {
          return 'The huge dictionary saturates DNS resolvers with high concurrency. Drop concurrent lookups to 25 or fewer.';
        }
        return null;
      },
    ],
  },
};

const getDefaultValues = (metadata?: ScriptMetadata): ScriptArgValues => {
  if (!metadata) return {};
  return metadata.args.reduce<ScriptArgValues>((acc, arg) => {
    if (typeof arg.defaultValue !== 'undefined') {
      acc[arg.key] = arg.defaultValue;
    } else if (arg.type === 'boolean') {
      acc[arg.key] = false;
    } else {
      acc[arg.key] = '';
    }
    return acc;
  }, {});
};

const validateValues = (
  metadata: ScriptMetadata | undefined,
  values: ScriptArgValues,
): string[] => {
  if (!metadata) return [];
  const messages: string[] = [];

  metadata.args.forEach((arg) => {
    const dependency = arg.dependsOn;
    if (dependency) {
      const dependencyValue = values[dependency.key];
      const satisfied = dependency.values.includes(dependencyValue);
      if (!satisfied) {
        return;
      }
    }

    const value = values[arg.key];
    if (arg.required) {
      const isEmpty =
        typeof value === 'undefined' ||
        value === '' ||
        (typeof value === 'number' && Number.isNaN(value));
      if (isEmpty) {
        messages.push(`${arg.label} is required.`);
        return;
      }
    }

    if (typeof value === 'undefined' || value === '') {
      return;
    }

    switch (arg.type) {
      case 'number': {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          messages.push(`${arg.label} must be a number.`);
          return;
        }
        if (typeof arg.min === 'number' && value < arg.min) {
          messages.push(`${arg.label} must be ≥ ${arg.min}.`);
        }
        if (typeof arg.max === 'number' && value > arg.max) {
          messages.push(`${arg.label} must be ≤ ${arg.max}.`);
        }
        break;
      }
      case 'select': {
        if (
          typeof value !== 'string' ||
          !arg.options?.some((option) => option.value === value)
        ) {
          messages.push(`${arg.label} must match an available option.`);
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          messages.push(`${arg.label} must be enabled or disabled.`);
        }
        break;
      }
      case 'string': {
        if (typeof value !== 'string') {
          messages.push(`${arg.label} must be text.`);
        }
        break;
      }
      default:
        break;
    }
  });

  metadata.rules?.forEach((rule) => {
    const result = rule(values);
    if (result) {
      messages.push(result);
    }
  });

  return messages;
};

export const serializeScriptArgs = (
  script: string,
  values: ScriptArgValues | undefined,
): string => {
  if (!values) return '';
  const metadata = scriptArgumentMetadata[script];
  if (!metadata) return '';

  const parts: string[] = [];
  metadata.args.forEach((arg) => {
    const dependency = arg.dependsOn;
    if (dependency) {
      const dependencyValue = values[dependency.key];
      const satisfied = dependency.values.includes(dependencyValue);
      if (!satisfied) {
        return;
      }
    }

    const value = values[arg.key];
    if (typeof value === 'undefined' || value === '') {
      return;
    }
    if (typeof value === 'boolean') {
      parts.push(`${script}.${arg.key}=${value ? 'true' : 'false'}`);
      return;
    }
    parts.push(`${script}.${arg.key}=${value}`);
  });

  return parts.join(',');
};

interface ScriptArgsProps {
  script: string;
  value?: ScriptArgValues;
  onChange: (change: ScriptArgsChange) => void;
}

const ScriptArgs: React.FC<ScriptArgsProps> = ({ script, value, onChange }) => {
  const metadata = scriptArgumentMetadata[script];
  const defaults = useMemo(() => getDefaultValues(metadata), [metadata]);
  const [localValues, setLocalValues] = useState<ScriptArgValues>(() => ({
    ...defaults,
    ...(value || {}),
  }));

  useEffect(() => {
    setLocalValues({
      ...defaults,
      ...(value || {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  const [presets, setPresets] = usePersistentState<Record<string, ScriptArgValues>>(
    `nmap-nse:presets:${script}`,
    metadata?.presets || {},
    isPresetMap,
  );

  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    if (!metadata) {
      onChange({
        values: {},
        errors: [],
        isValid: true,
        planner: null,
      });
      return;
    }

    const errors = validateValues(metadata, localValues);
    const planner: PlannerEntry | null = errors.length
      ? null
      : {
          script,
          summary: metadata.planner.summary,
          tags: metadata.planner.tags,
          args: localValues,
        };

    onChange({
      values: localValues,
      errors,
      isValid: errors.length === 0,
      planner,
    });
  }, [localValues, metadata, onChange, script]);

  if (!metadata) {
    return (
      <p className="mt-2 text-xs text-red-500">No argument metadata available.</p>
    );
  }

  const updateValue = (key: string, next: ArgPrimitive | '') => {
    setLocalValues((prev) => ({
      ...prev,
      [key]: next,
    }));
  };

  const renderField = (arg: ArgDefinition) => {
    const dependency = arg.dependsOn;
    const dependencySatisfied = dependency
      ? dependency.values.includes(localValues[dependency.key])
      : true;
    const value = localValues[arg.key];
    const baseLabelId = `${script}-${arg.key}`;

    const commonProps = {
      id: baseLabelId,
      name: baseLabelId,
      disabled: !dependencySatisfied,
      className:
        'w-full rounded border border-gray-400 bg-white p-1 text-sm text-black focus:outline-none focus:ring-2 focus:ring-ub-yellow',
      'aria-describedby': dependencySatisfied
        ? undefined
        : `${baseLabelId}-dependency`,
    } as const;

    switch (arg.type) {
      case 'string':
        return (
          <input
            {...commonProps}
            type="text"
            value={typeof value === 'string' ? value : ''}
            placeholder={arg.placeholder}
            onChange={(event) => updateValue(arg.key, event.target.value)}
          />
        );
      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            value={typeof value === 'number' ? value : value === '' ? '' : Number(value) || ''}
            min={arg.min}
            max={arg.max}
            step={arg.step}
            onChange={(event) => {
              const raw = event.target.value;
              updateValue(
                arg.key,
                raw === '' ? '' : Number.isNaN(Number(raw)) ? '' : Number(raw),
              );
            }}
          />
        );
      case 'boolean':
        return (
          <input
            id={baseLabelId}
            name={baseLabelId}
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(value)}
            disabled={!dependencySatisfied}
            aria-label={arg.label}
            onChange={(event) => updateValue(arg.key, event.target.checked)}
          />
        );
      case 'select':
        return (
          <select
            {...commonProps}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => updateValue(arg.key, event.target.value)}
          >
            {arg.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  const resetToDefaults = () => {
    setLocalValues({ ...defaults });
    setSelectedPreset('');
  };

  const applyPreset = (name: string) => {
    const preset = presets?.[name];
    if (!preset) return;
    setLocalValues({
      ...defaults,
      ...preset,
    });
    setSelectedPreset(name);
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    setPresets((current) => ({
      ...(current || {}),
      [name]: localValues,
    }));
    setSelectedPreset(name);
    setPresetName('');
  };

  const removePreset = () => {
    if (!selectedPreset) return;
    setPresets((current) => {
      if (!current) return current;
      const next = { ...current };
      delete next[selectedPreset];
      return next;
    });
    setSelectedPreset('');
  };

  const errors = validateValues(metadata, localValues);

  return (
    <div className="mt-2 space-y-3 rounded border border-gray-300 bg-gray-50 p-2 text-black">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Arguments
        </span>
        <button
          type="button"
          onClick={resetToDefaults}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Reset
        </button>
      </div>
      {metadata.args.map((arg) => {
        const dependency = arg.dependsOn;
        const dependencySatisfied = dependency
          ? dependency.values.includes(localValues[dependency.key])
          : true;
        const baseLabelId = `${script}-${arg.key}`;
        return (
          <div key={arg.key} className="space-y-1">
            <label htmlFor={baseLabelId} className="flex items-center gap-2 text-sm font-medium text-gray-800">
              {arg.label}
              {arg.type === 'boolean' && renderField(arg)}
            </label>
            {arg.type !== 'boolean' && renderField(arg)}
            {arg.description && (
              <p className="text-xs text-gray-600">{arg.description}</p>
            )}
            {dependency && !dependencySatisfied && (
              <p
                id={`${baseLabelId}-dependency`}
                className="text-xs text-orange-600"
              >
                {dependency.message || 'Adjust the related option to enable this setting.'}
              </p>
            )}
          </div>
        );
      })}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Presets
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-w-[8rem] rounded border border-gray-400 bg-white p-1 text-sm"
            value={selectedPreset}
            aria-label="Load saved preset"
            onChange={(event) => applyPreset(event.target.value)}
          >
            <option value="">Load preset…</option>
            {presets &&
              Object.keys(presets).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={removePreset}
            disabled={!selectedPreset}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Delete
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="Preset name"
            aria-label="Preset name"
            className="flex-1 min-w-[8rem] rounded border border-gray-400 bg-white p-1 text-sm text-black"
          />
          <button
            type="button"
            onClick={savePreset}
            className="rounded bg-blue-700 px-2 py-1 text-xs text-white"
          >
            Save current
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Planner context
        </p>
        <p className="text-xs text-gray-700">{metadata.planner.summary}</p>
        <div className="flex flex-wrap gap-1">
          {metadata.planner.tags.map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-200 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      {errors.length > 0 && (
        <div className="rounded border border-red-400 bg-red-50 p-2 text-xs text-red-700">
          <p className="font-semibold">Resolve before running:</p>
          <ul className="list-disc pl-4">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScriptArgs;

