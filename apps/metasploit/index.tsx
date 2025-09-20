'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import modulesData from '../../components/apps/metasploit/modules.json';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';

interface Module {
  name: string;
  description: string;
  type: string;
  severity: string;
  [key: string]: any;
}

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

type PayloadOptionType = 'text' | 'number' | 'select';

interface PayloadOptionDefinition {
  label: string;
  type: PayloadOptionType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  choices?: { label: string; value: string }[];
  helperText?: string;
  validate?: (value: string) => string | null;
}

interface PayloadDefinition {
  value: string;
  label: string;
  description: string;
  options: Record<string, PayloadOptionDefinition>;
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
};

const IPV4_REGEX = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

const payloadDefinitions: PayloadDefinition[] = [
  {
    value: 'windows/meterpreter/reverse_tcp',
    label: 'windows/meterpreter/reverse_tcp',
    description:
      'Establish a Windows Meterpreter session by connecting back to the specified handler.',
    options: {
      LHOST: {
        label: 'LHOST',
        type: 'text',
        required: true,
        placeholder: '192.168.0.15',
        pattern: IPV4_REGEX,
        patternMessage: 'LHOST must be a valid IPv4 address.',
        helperText: 'Callback host IPv4 address used by the payload.',
      },
      LPORT: {
        label: 'LPORT',
        type: 'number',
        required: true,
        defaultValue: 4444,
        min: 1,
        max: 65535,
        helperText: 'Callback port exposed by the handler.',
      },
      EXITFUNC: {
        label: 'EXITFUNC',
        type: 'select',
        defaultValue: 'process',
        choices: [
          { label: 'process', value: 'process' },
          { label: 'thread', value: 'thread' },
          { label: 'seh', value: 'seh' },
        ],
        helperText: 'Method the payload uses to terminate cleanly.',
      },
    },
  },
  {
    value: 'linux/x64/shell_reverse_tcp',
    label: 'linux/x64/shell_reverse_tcp',
    description:
      'Launch a reverse TCP shell for Linux x64 targets and receive commands remotely.',
    options: {
      LHOST: {
        label: 'LHOST',
        type: 'text',
        required: true,
        placeholder: '10.0.0.5',
        pattern: IPV4_REGEX,
        patternMessage: 'LHOST must be a valid IPv4 address.',
        helperText: 'Callback host IPv4 address used by the payload.',
      },
      LPORT: {
        label: 'LPORT',
        type: 'number',
        required: true,
        defaultValue: 4444,
        min: 1,
        max: 65535,
        helperText: 'Callback port exposed by the handler.',
      },
      SHELL: {
        label: 'SHELL',
        type: 'select',
        defaultValue: '/bin/bash',
        choices: [
          { label: '/bin/bash', value: '/bin/bash' },
          { label: '/bin/sh', value: '/bin/sh' },
        ],
        helperText: 'Shell that should launch once the session is established.',
      },
    },
  },
  {
    value: 'android/meterpreter/reverse_http',
    label: 'android/meterpreter/reverse_http',
    description:
      'Deliver an Android Meterpreter payload that connects over HTTP.',
    options: {
      LHOST: {
        label: 'LHOST',
        type: 'text',
        required: true,
        placeholder: '172.16.0.3',
        pattern: IPV4_REGEX,
        patternMessage: 'LHOST must be a valid IPv4 address.',
        helperText: 'Callback host IPv4 address used by the payload.',
      },
      LPORT: {
        label: 'LPORT',
        type: 'number',
        required: true,
        defaultValue: 8080,
        min: 1,
        max: 65535,
        helperText: 'Callback port exposed by the handler.',
      },
      URIPATH: {
        label: 'URIPATH',
        type: 'text',
        defaultValue: '/payload',
        placeholder: '/update',
        helperText: 'Optional URI path the payload will request (must start with /).',
        validate: (value) =>
          value.startsWith('/')
            ? null
            : 'URIPATH must start with a forward slash.',
      },
      SessionTimeout: {
        label: 'SessionTimeout',
        type: 'number',
        defaultValue: 600,
        min: 30,
        max: 3600,
        helperText: 'Duration in seconds the handler should keep the session alive.',
      },
    },
  },
];

const defaultPayloadDefinition = payloadDefinitions[0];

if (!defaultPayloadDefinition) {
  throw new Error('At least one payload definition must be provided.');
}

const getDefaultValues = (definition: PayloadDefinition): Record<string, string> =>
  Object.entries(definition.options).reduce((acc, [key, option]) => {
    if (option.defaultValue !== undefined) {
      acc[key] = String(option.defaultValue);
      return acc;
    }
    if (option.type === 'select' && option.choices && option.choices.length > 0) {
      acc[key] = option.choices[0].value;
      return acc;
    }
    acc[key] = '';
    return acc;
  }, {} as Record<string, string>);

const validateOptions = (
  definition: PayloadDefinition,
  values: Record<string, string>,
): Record<string, string> => {
  const newErrors: Record<string, string> = {};

  Object.entries(definition.options).forEach(([key, option]) => {
    const rawValue = values[key] ?? '';
    const trimmedValue = rawValue.trim();
    const hasValue =
      option.type === 'select' ? rawValue !== '' : trimmedValue !== '';

    if (option.required && !hasValue) {
      newErrors[key] = `${option.label} is required.`;
      return;
    }

    if (!hasValue) {
      return;
    }

    if (option.type === 'number') {
      const numericValue = Number(trimmedValue);

      if (Number.isNaN(numericValue)) {
        newErrors[key] = `${option.label} must be a valid number.`;
        return;
      }

      if (option.min !== undefined && numericValue < option.min) {
        newErrors[key] = `${option.label} must be at least ${option.min}.`;
        return;
      }

      if (option.max !== undefined && numericValue > option.max) {
        newErrors[key] = `${option.label} must be at most ${option.max}.`;
        return;
      }

      if (option.validate) {
        const message = option.validate(String(numericValue));
        if (message) {
          newErrors[key] = message;
        }
      }
      return;
    }

    if (option.type === 'text') {
      if (option.pattern && !option.pattern.test(trimmedValue)) {
        newErrors[key] = option.patternMessage || `${option.label} is invalid.`;
        return;
      }

      if (option.validate) {
        const message = option.validate(trimmedValue);
        if (message) {
          newErrors[key] = message;
        }
      }
      return;
    }

    if (option.type === 'select') {
      if (
        option.choices &&
        !option.choices.some((choice) => choice.value === rawValue)
      ) {
        newErrors[key] = `${option.label} must be one of the available options.`;
        return;
      }

      if (option.validate) {
        const message = option.validate(rawValue);
        if (message) {
          newErrors[key] = message;
        }
      }
    }
  });

  return newErrors;
};

function buildTree(mods: Module[]): TreeNode {
  const root: TreeNode = {};
  mods.forEach((mod) => {
    const parts = mod.name.split('/');
    let node: TreeNode = root;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        if (!node.__modules) node.__modules = [];
        node.__modules.push(mod);
      } else {
        node[part] = (node[part] as TreeNode) || {};
        node = node[part] as TreeNode;
      }
    });
  });
  return root;
}

const MetasploitPage: React.FC = () => {
  const [selected, setSelected] = useState<Module | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [selectedPayloadValue, setSelectedPayloadValue] = useState(
    defaultPayloadDefinition.value,
  );
  const selectedPayloadDefinition = useMemo(
    () =>
      payloadDefinitions.find((payload) => payload.value === selectedPayloadValue) ||
      defaultPayloadDefinition,
    [selectedPayloadValue],
  );
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() =>
    getDefaultValues(selectedPayloadDefinition),
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState('');

  const allTags = useMemo(
    () =>
      Array.from(
        new Set((modulesData as Module[]).flatMap((m) => m.tags || [])),
      ).sort(),
    [],
  );

  const filteredModules = useMemo(
    () =>
      (modulesData as Module[]).filter((m) => {
        if (tag && !(m.tags || []).includes(tag)) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tag, query],
  );

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  useEffect(() => {
    setSelected(null);
  }, [query, tag]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  useEffect(() => {
    setOptionValues(getDefaultValues(selectedPayloadDefinition));
    setPreview('');
    setValidationErrors({});
  }, [selectedPayloadDefinition]);

  const handleOptionChange = (key: string, value: string) => {
    setOptionValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPayloadDefinition) {
      return;
    }

    const errors = validateOptions(selectedPayloadDefinition, optionValues);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setPreview('');
      return;
    }

    setValidationErrors({});

    const normalizedOptions = Object.entries(selectedPayloadDefinition.options).reduce(
      (acc, [key, option]) => {
        const rawValue = optionValues[key] ?? '';

        if (option.type === 'number') {
          const trimmed = rawValue.trim();
          if (trimmed === '') {
            return acc;
          }
          acc[key] = Number(trimmed);
          return acc;
        }

        if (option.type === 'text') {
          const trimmed = rawValue.trim();
          if (!trimmed) {
            return acc;
          }
          acc[key] = trimmed;
          return acc;
        }

        if (option.type === 'select') {
          if (!rawValue) {
            return acc;
          }
          acc[key] = rawValue;
        }

        return acc;
      },
      {} as Record<string, string | number>,
    );

    const generatedPreview = JSON.stringify(
      {
        payload: selectedPayloadDefinition.value,
        options: normalizedOptions,
      },
      null,
      2,
    );

    setPreview(generatedPreview);
    setToast('Payload JSON generated');
  };

  const handleCopy = async () => {
    if (!preview) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(preview);
        setToast('Payload JSON copied to clipboard');
      } else {
        setToast('Clipboard support is unavailable');
      }
    } catch (error) {
      setToast('Failed to copy payload JSON');
    }
  };

  const renderTree = (node: TreeNode) => (
    <ul className="ml-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details>
              <summary className="cursor-pointer">{key}</summary>
              {renderTree(child as TreeNode)}
            </details>
          </li>
        ))}
      {(node.__modules || []).map((mod) => (
        <li key={mod.name}>
          <button
            onClick={() => setSelected(mod)}
            className="flex justify-between w-full text-left px-1 py-0.5 hover:bg-gray-100"
          >
            <span>{mod.name.split('/').pop()}</span>
            <span
              className={`ml-2 text-xs text-white px-1 rounded ${typeColors[mod.type] || 'bg-gray-500'}`}
            >
              {mod.type}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r overflow-auto p-2">
        <input
          type="text"
          placeholder="Search modules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search modules"
          className="w-full p-1 mb-2 border rounded"
        />
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => setTag('')}
            className={`px-2 py-0.5 text-xs rounded ${
              tag === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-xs rounded ${
                tag === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {renderTree(tree)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div>
              <h2 className="font-bold mb-2 flex items-center">
                {selected.name}
                <span
                  className={`ml-2 text-xs text-white px-2 py-0.5 rounded ${typeColors[selected.type] || 'bg-gray-500'}`}
                >
                  {selected.type}
                </span>
              </h2>
              <p className="whitespace-pre-wrap">{selected.description}</p>
            </div>
          ) : (
            <p>Select a module to view details</p>
          )}
        </div>
        <div ref={splitRef} className="h-96 border-t flex flex-col">
          <div style={{ height: `calc(${split}% - 2px)` }} className="overflow-auto">
            <MetasploitApp />
          </div>
          <div
            className="h-1 bg-gray-400 cursor-row-resize"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto p-2 space-y-2"
          >
            <h3 className="font-semibold">Generate Payload</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label
                  htmlFor="payload-select"
                  className="block text-sm font-medium text-gray-700"
                >
                  Payload
                </label>
                <select
                  id="payload-select"
                  value={selectedPayloadDefinition.value}
                  onChange={(event) =>
                    setSelectedPayloadValue(event.target.value)
                  }
                  aria-label="Payload"
                  className="mt-1 block w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {payloadDefinitions.map((payload) => (
                    <option key={payload.value} value={payload.value}>
                      {payload.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-600">
                  {selectedPayloadDefinition.description}
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedPayloadDefinition.options).map(
                  ([key, option]) => (
                    <div key={key}>
                      <label
                        htmlFor={`option-${key}`}
                        className="block text-sm font-medium text-gray-700"
                      >
                        {option.label}
                        {option.required && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </label>
                      {option.type === 'select' ? (
                        <select
                          id={`option-${key}`}
                          value={optionValues[key] ?? ''}
                          onChange={(event) =>
                            handleOptionChange(key, event.target.value)
                          }
                          aria-label={option.label}
                          className={`mt-1 block w-full rounded border p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            validationErrors[key]
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {option.choices?.map((choice) => (
                            <option key={choice.value} value={choice.value}>
                              {choice.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`option-${key}`}
                          type={option.type === 'number' ? 'number' : 'text'}
                          value={optionValues[key] ?? ''}
                          onChange={(event) =>
                            handleOptionChange(key, event.target.value)
                          }
                          placeholder={option.placeholder}
                          aria-label={option.label}
                          min={
                            option.type === 'number' && option.min !== undefined
                              ? option.min
                              : undefined
                          }
                          max={
                            option.type === 'number' && option.max !== undefined
                              ? option.max
                              : undefined
                          }
                          className={`mt-1 block w-full rounded border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            validationErrors[key]
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                      )}
                      {option.helperText && (
                        <p className="mt-1 text-xs text-gray-500">
                          {option.helperText}
                        </p>
                      )}
                      {validationErrors[key] && (
                        <p className="mt-1 text-xs text-red-600">
                          {validationErrors[key]}
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Generate JSON
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!preview}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy JSON
                </button>
              </div>
            </form>

            {Object.keys(validationErrors).length > 0 && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">Validation errors</p>
                <ul className="ml-5 list-disc">
                  {Object.entries(validationErrors).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview && (
              <div className="space-y-2">
                <h4 className="font-semibold">Payload JSON Preview</h4>
                <pre
                  data-testid="payload-preview"
                  className="max-h-56 overflow-auto rounded bg-gray-900 p-3 text-xs text-green-300"
                >
                  {preview}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default MetasploitPage;

