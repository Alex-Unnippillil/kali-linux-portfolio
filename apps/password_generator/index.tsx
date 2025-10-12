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
        barClass: 'bg-gray-600',
        badgeClass: 'bg-gray-900/80 text-gray-300 border border-gray-600',
      };
    if (entropy < 40)
      return {
        label: 'Weak',
        barClass: 'bg-red-500',
        badgeClass: 'bg-red-500/20 text-red-300 border border-red-400/60',
      };
    if (entropy < 80)
      return {
        label: 'Medium',
        barClass: 'bg-yellow-400',
        badgeClass: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/60',
      };
    return {
      label: 'Strong',
      barClass: 'bg-green-500',
      badgeClass: 'bg-green-500/20 text-green-200 border border-green-400/60',
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
    `flex items-center gap-3 rounded-full border px-3 py-2 text-sm font-medium transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-900 ${
      active
        ? 'bg-blue-600/20 border-blue-400/70 text-blue-100 shadow-lg shadow-blue-900/30'
        : 'bg-gray-800/80 border-gray-700 text-gray-200 hover:bg-gray-700'
    }`;

  const lengthLabelId = 'password-length-label';

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-5">
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
          className="w-full accent-blue-500"
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
            className="w-20 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className={`px-4 py-2 rounded-full border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-gray-900 text-sm font-semibold tracking-wide uppercase ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-900/40'
                  : 'bg-gray-800 text-gray-200 border-gray-600 hover:bg-gray-700'
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
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
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
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
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
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
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
            className="h-4 w-4 rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500"
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
          className="flex-1 rounded border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-lg leading-[1.2] text-green-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Generated password"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="w-full rounded bg-blue-600 px-4 py-2 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-blue-900/40 transition hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-gray-900 sm:w-auto"
        >
          Copy
        </button>
      </div>
      {copied && <div className="text-sm font-medium text-green-400">Copied!</div>}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div className={`h-full ${barClass}`} style={{ width }} />
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}>
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span className="font-mono text-base text-white">
            {entropy.toFixed(1)} bits
          </span>
          <span className="text-xs uppercase tracking-wide text-gray-400">Entropy</span>
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
          className="w-full rounded bg-green-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-green-900/30 transition hover:bg-green-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 focus-visible:ring-offset-gray-900"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;
