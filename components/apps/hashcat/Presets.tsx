import React, { useMemo, useState } from 'react';

export type PresetField = 'hashType' | 'attackMode' | 'mask' | 'ruleSet' | 'wordlist';

export type PresetChanges = Partial<Record<PresetField, string>>;

export interface PresetDiffEntry {
  field: PresetField;
  currentValue?: string;
  nextValue: string;
}

export interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  changes: PresetChanges;
}

export const curatedPresets: PresetDefinition[] = [
  {
    id: 'sha1-pin-bruteforce',
    name: 'SHA-1 PIN Bruteforce',
    description:
      'Brute-force a 6-digit SHA-1 hash with a numeric mask. Demonstrates mask-based attacks.',
    changes: {
      hashType: '100',
      attackMode: '3',
      mask: '?d?d?d?d?d?d',
    },
  },
  {
    id: 'md5-wordlist-rules',
    name: 'MD5 Wordlist + Rules',
    description:
      'Straight attack targeting MD5 hashes with the rockyou list and best64 rules.',
    changes: {
      hashType: '0',
      attackMode: '0',
      wordlist: 'rockyou',
      ruleSet: 'best64',
    },
  },
  {
    id: 'bcrypt-hybrid',
    name: 'bcrypt Hybrid Wordlist + Mask',
    description:
      'Hybrid attack for bcrypt hashes that appends two digits to rockyou entries using quick rules.',
    changes: {
      hashType: '3200',
      attackMode: '6',
      mask: '?d?d',
      wordlist: 'rockyou',
      ruleSet: 'quick',
    },
  },
];

export const generatePresetDiff = (
  changes: PresetChanges,
  current: PresetChanges
): PresetDiffEntry[] => {
  return (Object.entries(changes) as [PresetField, string | undefined][])
    .filter(([, value]) => value !== undefined)
    .reduce<PresetDiffEntry[]>((acc, [field, value]) => {
      if (value === undefined) {
        return acc;
      }
      const currentValue = current[field];
      if (currentValue !== value) {
        acc.push({ field, currentValue, nextValue: value });
      }
      return acc;
    }, []);
};

export type PresetSetterMap = Partial<
  Record<PresetField, (value: string) => void>
>;

export const applyPresetChanges = (
  changes: PresetChanges,
  setters: PresetSetterMap
): void => {
  (Object.entries(changes) as [PresetField, string | undefined][]).forEach(
    ([field, value]) => {
      if (value === undefined) {
        return;
      }
      const setter = setters[field];
      if (typeof setter === 'function') {
        setter(value);
      }
    }
  );
};

export interface PresetsProps {
  currentConfig: PresetChanges;
  onApplyPreset: (changes: PresetChanges) => void;
}

const fieldLabels: Record<PresetField, string> = {
  hashType: 'Hash Type',
  attackMode: 'Attack Mode',
  mask: 'Mask',
  ruleSet: 'Rule Set',
  wordlist: 'Wordlist',
};

const Presets: React.FC<PresetsProps> = ({ currentConfig, onApplyPreset }) => {
  const [previewing, setPreviewing] = useState<string | null>(null);

  const diffsByPreset = useMemo(() => {
    return curatedPresets.reduce<Record<string, PresetDiffEntry[]>>(
      (acc, preset) => {
        acc[preset.id] = generatePresetDiff(preset.changes, currentConfig);
        return acc;
      },
      {}
    );
  }, [currentConfig]);

  return (
    <section className="w-full max-w-md bg-black/40 border border-ub-grey rounded-lg p-4 space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Presets</h2>
        <p className="text-xs text-gray-300">
          Preview curated attack configurations and apply them to the simulator.
        </p>
      </header>
      <ul className="space-y-3">
        {curatedPresets.map((preset) => {
          const diff = diffsByPreset[preset.id] || [];
          const isPreviewing = previewing === preset.id;
          const canApply = isPreviewing && diff.length > 0;

          return (
            <li
              key={preset.id}
              className="border border-ub-grey/70 rounded-md p-3 bg-ub-cool-grey/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-sm">{preset.name}</h3>
                  <p className="text-xs text-gray-300">{preset.description}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="text-xs bg-ub-grey px-2 py-1 rounded hover:bg-ub-grey/80"
                    onClick={() =>
                      setPreviewing((current) =>
                        current === preset.id ? null : preset.id
                      )
                    }
                    aria-pressed={isPreviewing}
                  >
                    {isPreviewing ? 'Hide diff' : 'Preview diff'}
                  </button>
                  <button
                    type="button"
                    className="text-xs bg-blue-600 px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => {
                      if (!canApply) return;
                      onApplyPreset(preset.changes);
                      setPreviewing(null);
                    }}
                    disabled={!canApply}
                  >
                    Apply preset
                  </button>
                </div>
              </div>
              {isPreviewing && (
                <div className="mt-3">
                  {diff.length > 0 ? (
                    <dl className="space-y-2">
                      {diff.map(({ field, currentValue, nextValue }) => (
                        <div
                          key={field}
                          className="border border-blue-400/60 bg-blue-900/20 rounded-md px-2 py-1"
                        >
                          <dt className="text-[10px] uppercase tracking-wide text-blue-200">
                            {fieldLabels[field]}
                          </dt>
                          <dd className="text-xs text-gray-300">
                            <span className="mr-1 text-gray-400">Current:</span>
                            <code className="text-amber-200">
                              {currentValue ?? '—'}
                            </code>
                          </dd>
                          <dd className="text-xs text-gray-300">
                            <span className="mr-1 text-gray-400">Preset:</span>
                            <code className="text-green-300">{nextValue}</code>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Preset matches the current configuration.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Presets;
