'use client';
import React, { useState } from 'react';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

interface PasswordGeneratorProps {
  getDailySeed?: () => Promise<string>;
}

const PRESETS = [
  {
    label: 'High security',
    config: {
      length: 20,
      useLower: true,
      useUpper: true,
      useNumbers: true,
      useSymbols: true,
    },
  },
  {
    label: 'Memorable',
    config: {
      length: 8,
      useLower: true,
      useUpper: false,
      useNumbers: false,
      useSymbols: false,
    },
  },
];

const MIN_LENGTH = 4;
const MAX_LENGTH = 64;

const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ getDailySeed }) => {
  void getDailySeed;
  const [length, setLength] = useState(12);
  const [useLower, setUseLower] = useState(true);
  const [useUpper, setUseUpper] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const clearPresetSelection = () => setSelectedPreset(null);

  const applyPreset = (presetLabel: string) => {
    const preset = PRESETS.find((item) => item.label === presetLabel);
    if (!preset) return;
    const { config } = preset;
    setLength(config.length);
    setUseLower(config.useLower);
    setUseUpper(config.useUpper);
    setUseNumbers(config.useNumbers);
    setUseSymbols(config.useSymbols);
    setSelectedPreset(preset.label);
  };

  const generatePassword = () => {
    let chars = '';
    if (useLower) chars += LOWER;
    if (useUpper) chars += UPPER;
    if (useNumbers) chars += NUMS;
    if (useSymbols) chars += SYMBOLS;
    if (!chars) {
      setPassword('');
      return;
    }
    let pwd = '';
    for (let i = 0; i < length; i += 1) {
      const idx = Math.floor(Math.random() * chars.length);
      pwd += chars[idx];
    }
    setPassword(pwd);
  };

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard?.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const poolSize =
    (useLower ? LOWER.length : 0) +
    (useUpper ? UPPER.length : 0) +
    (useNumbers ? NUMS.length : 0) +
    (useSymbols ? SYMBOLS.length : 0);

  const entropy = poolSize ? length * Math.log2(poolSize) : 0;

  const strengthInfo = () => {
    if (!entropy)
      return {
        label: 'None',
        barClass: 'bg-[color:var(--kali-border)]',
        badgeClass:
          'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-border)_18%,transparent)] text-[color:color-mix(in_srgb,var(--kali-border)_88%,white)]',
      };
    if (entropy < 40)
      return {
        label: 'Weak',
        barClass: 'bg-[color:var(--color-severity-critical)]',
        badgeClass:
          'border border-[color:color-mix(in_srgb,var(--color-severity-critical)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-critical)_16%,transparent)] text-[color:var(--color-severity-critical)]',
      };
    if (entropy < 80)
      return {
        label: 'Medium',
        barClass: 'bg-[color:var(--color-severity-medium)]',
        badgeClass:
          'border border-[color:color-mix(in_srgb,var(--color-severity-medium)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-medium)_16%,transparent)] text-[color:var(--color-severity-medium)]',
      };
    return {
      label: 'Strong',
      barClass: 'bg-[color:var(--color-severity-low)]',
      badgeClass:
        'border border-[color:color-mix(in_srgb,var(--color-severity-low)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_16%,transparent)] text-[color:var(--color-severity-low)]',
    };
  };

  const { label, barClass, badgeClass } = strengthInfo();
  const width = `${entropy ? Math.min(entropy, 128) / 128 * 100 : 0}%`;

  const handleLengthChange = (value: number) => {
    const clamped = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Number.isNaN(value) ? MIN_LENGTH : value));
    setLength(clamped);
    clearPresetSelection();
  };

  const toggleLabelClasses = (active: boolean) =>
    `flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-[color:var(--kali-control)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--kali-panel)] ${
      active
        ? 'border-[color:color-mix(in_srgb,var(--kali-control)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_22%,transparent)] text-[color:var(--kali-control)] shadow-[0_12px_30px_-18px_color-mix(in_srgb,var(--kali-control)_65%,transparent)]'
        : 'border-[color:var(--kali-border)] bg-[color:var(--kali-control-surface)] text-white/80 hover:bg-[color:color-mix(in_srgb,var(--kali-control-surface)_88%,var(--kali-control))]'
    }`;

  const lengthLabelId = 'password-length-label';

  return (
    <div className="flex h-full w-full flex-col space-y-5 bg-[var(--kali-panel)] p-4 text-white">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
          <span id={lengthLabelId}>Password length</span>
          <span className="font-mono text-lg text-white">{length}</span>
        </div>
        <input
          id="password-length-slider"
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          value={length}
          onChange={(e) => handleLengthChange(parseInt(e.target.value, 10))}
          className="w-full rounded-full bg-[color:var(--kali-control-surface)] accent-[color:var(--kali-control)]"
          aria-labelledby={lengthLabelId}
        />
        <div className="flex items-center gap-3">
          <label id="manual-length-label" htmlFor="length" className="text-sm text-gray-300">
            Manual entry
          </label>
          <input
            id="length"
            type="number"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={length}
            onChange={(e) => handleLengthChange(parseInt(e.target.value, 10))}
            className="w-20 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-control-surface)] px-2 py-1 text-white focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:var(--kali-control)]"
            aria-labelledby="manual-length-label"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((preset) => {
          const isActive = selectedPreset === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.label)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-wide transition focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] ${
                isActive
                  ? 'border-[color:color-mix(in_srgb,var(--kali-control)_55%,transparent)] bg-[color:var(--kali-control)] text-[color:var(--color-inverse)] shadow-[0_12px_30px_-18px_color-mix(in_srgb,var(--kali-control)_65%,transparent)]'
                  : 'border-[color:var(--kali-border)] bg-[color:var(--kali-control-surface)] text-white/80 hover:bg-[color:color-mix(in_srgb,var(--kali-control-surface)_88%,var(--kali-control))]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={toggleLabelClasses(useLower)} htmlFor="toggle-lowercase">
          <input
            id="toggle-lowercase"
            type="checkbox"
            checked={useLower}
            onChange={(e) => {
              clearPresetSelection();
              setUseLower(e.target.checked);
            }}
            className="h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-control)] focus:ring-[color:var(--kali-control)]"
            aria-label="Include lowercase characters"
          />
          <span>Lowercase</span>
        </label>
        <label className={toggleLabelClasses(useUpper)} htmlFor="toggle-uppercase">
          <input
            id="toggle-uppercase"
            type="checkbox"
            checked={useUpper}
            onChange={(e) => {
              clearPresetSelection();
              setUseUpper(e.target.checked);
            }}
            className="h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-control)] focus:ring-[color:var(--kali-control)]"
            aria-label="Include uppercase characters"
          />
          <span>Uppercase</span>
        </label>
        <label className={toggleLabelClasses(useNumbers)} htmlFor="toggle-numbers">
          <input
            id="toggle-numbers"
            type="checkbox"
            checked={useNumbers}
            onChange={(e) => {
              clearPresetSelection();
              setUseNumbers(e.target.checked);
            }}
            className="h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-control)] focus:ring-[color:var(--kali-control)]"
            aria-label="Include numbers"
          />
          <span>Numbers</span>
        </label>
        <label className={toggleLabelClasses(useSymbols)} htmlFor="toggle-symbols">
          <input
            id="toggle-symbols"
            type="checkbox"
            checked={useSymbols}
            onChange={(e) => {
              clearPresetSelection();
              setUseSymbols(e.target.checked);
            }}
            className="h-4 w-4 rounded border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] text-[color:var(--kali-control)] focus:ring-[color:var(--kali-control)]"
            aria-label="Include symbols"
          />
          <span>Symbols</span>
        </label>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          data-testid="password-display"
          type="text"
          readOnly
          value={password}
          className="flex-1 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-control-surface)] px-3 py-2 font-mono text-lg leading-[1.2] text-green-100 placeholder:text-gray-500 focus:border-[color:var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[color:var(--kali-control)]"
          aria-label="Generated password"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="w-full rounded bg-[color:var(--kali-control)] px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-[0_18px_35px_-22px_color-mix(in_srgb,var(--kali-control)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--kali-control)_88%,black)] focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] sm:w-auto"
        >
          Copy
        </button>
      </div>
      {copied && <div className="text-sm font-medium text-[color:var(--color-success)]">Copied!</div>}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--kali-control-surface)]">
            <div className={`h-full ${barClass}`} style={{ width }} />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="font-mono text-base text-white">
            {`Entropy: ${entropy.toFixed(1)} bits (${label})`}
          </span>
          <span className="text-xs uppercase tracking-wide text-gray-400">Entropy · {label}</span>
          <span
            className="text-xs text-blue-300"
            role="img"
            aria-label="Entropy information"
            title="Entropy measures password unpredictability. 0-40 bits is weak, 40-80 bits is medium, and 80+ bits is recommended for high-security usage."
          >
            ⓘ
          </span>
        </div>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          onClick={generatePassword}
          className="w-full rounded bg-[color:var(--color-success)] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-[0_18px_35px_-22px_color-mix(in_srgb,var(--color-success)_75%,transparent)] transition hover:bg-[color:color-mix(in_srgb,var(--color-success)_88%,black)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)]"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;
