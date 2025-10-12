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
        barClass: 'bg-[color-mix(in_srgb,var(--color-surface)_75%,transparent)]',
        badgeClass:
          'border border-white/10 bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] text-white/60',
      };
    if (entropy < 40)
      return {
        label: 'Weak',
        barClass:
          'bg-[var(--color-warning)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-warning)_45%,transparent)]',
        badgeClass:
          'border border-[color-mix(in_srgb,var(--color-warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-surface))] text-[var(--color-warning)]',
      };
    if (entropy < 80)
      return {
        label: 'Guarded',
        barClass:
          'bg-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-success))] shadow-[0_0_16px_color-mix(in_srgb,var(--color-success)_35%,transparent)]',
        badgeClass:
          'border border-[color-mix(in_srgb,var(--color-success)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-success)_80%,var(--color-warning)_20%)]',
      };
    return {
      label: 'Strong',
      barClass:
        'bg-[var(--color-success)] shadow-[0_0_18px_color-mix(in_srgb,var(--color-success)_55%,transparent)]',
      badgeClass:
        'border border-[color-mix(in_srgb,var(--color-success)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-surface))] text-[var(--color-success)]',
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
    `flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kali-focus ${
      active
        ? 'border-[color-mix(in_srgb,var(--color-control-accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-control-accent)_18%,var(--color-surface))] text-white shadow-[0_0_18px_color-mix(in_srgb,var(--color-control-accent)_35%,transparent)]'
        : 'border-white/10 bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] text-white/85 hover:border-[color-mix(in_srgb,var(--color-control-accent)_45%,transparent)] hover:text-white'
    }`;

  const lengthLabelId = 'password-length-label';

  return (
    <div className="h-full w-full bg-[var(--color-surface)] text-kali-text p-4 flex flex-col space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
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
          className="kali-slider w-full accent-[var(--color-control-accent)]"
          aria-labelledby={lengthLabelId}
        />
        <div className="flex items-center gap-3">
          <label id="manual-length-label" htmlFor="length" className="text-sm text-white/70">
            Manual entry
          </label>
          <input
            id="length"
            type="number"
            min={MIN_LENGTH}
            max={MAX_LENGTH}
            value={length}
            onChange={(e) => handleLengthChange(parseInt(e.target.value, 10))}
            className="w-20 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--color-dark)_85%,transparent)] px-2 py-1 text-right text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
              className={`px-4 py-2 rounded-full border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus text-sm font-semibold tracking-wide uppercase ${
                isActive
                  ? 'border-[color-mix(in_srgb,var(--color-control-accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-control-accent)_18%,var(--color-surface))] text-white shadow-[0_0_18px_color-mix(in_srgb,var(--color-control-accent)_35%,transparent)]'
                  : 'border-white/10 bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] text-white/85 hover:border-[color-mix(in_srgb,var(--color-control-accent)_45%,transparent)] hover:text-white'
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
            className="h-4 w-4 rounded border border-white/15 bg-[color-mix(in_srgb,var(--color-dark)_78%,transparent)] text-[var(--color-control-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
            className="h-4 w-4 rounded border border-white/15 bg-[color-mix(in_srgb,var(--color-dark)_78%,transparent)] text-[var(--color-control-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
            className="h-4 w-4 rounded border border-white/15 bg-[color-mix(in_srgb,var(--color-dark)_78%,transparent)] text-[var(--color-control-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
            className="h-4 w-4 rounded border border-white/15 bg-[color-mix(in_srgb,var(--color-dark)_78%,transparent)] text-[var(--color-control-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
          className="flex-1 rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--color-dark)_82%,transparent)] px-3 py-2 font-mono text-lg leading-[1.2] text-[var(--color-success)] placeholder:text-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          aria-label="Generated password"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="w-full rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-white/90 shadow-kali-panel transition hover:border-[color-mix(in_srgb,var(--color-control-accent)_45%,transparent)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus sm:w-auto"
        >
          Copy
        </button>
      </div>
      {copied && (
        <div className="text-sm font-medium text-[var(--color-success)]">Copied!</div>
      )}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface)_75%,transparent)]">
            <div className={`h-full ${barClass}`} style={{ width }} />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="font-mono text-base text-white">
            {entropy.toFixed(1)} bits
          </span>
          <span className="text-xs uppercase tracking-wide text-white/50">Entropy</span>
          <span
            className="text-xs text-[var(--color-control-accent)]"
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
          className="w-full rounded-lg border border-[color-mix(in_srgb,var(--color-success)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-success)_18%,var(--color-surface))] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-success)] shadow-[0_0_22px_color-mix(in_srgb,var(--color-success)_35%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--color-success)_26%,var(--color-surface))] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;
