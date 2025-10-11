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
    if (!entropy) return { label: 'None', color: 'bg-gray-500' };
    if (entropy < 40) return { label: 'Weak', color: 'bg-red-500' };
    if (entropy < 80) return { label: 'Medium', color: 'bg-yellow-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const { label, color } = strengthInfo();
  const width = `${entropy ? Math.min(entropy, 128) / 128 * 100 : 0}%`;

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div>
        <label htmlFor="length" className="mr-2">Length:</label>
        <input
          id="length"
          type="number"
          min={4}
          max={64}
          value={length}
          onChange={(e) => {
            clearPresetSelection();
            setLength(parseInt(e.target.value, 10) || 0);
          }}
          className="text-black px-2"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isActive = selectedPreset === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.label)}
              className={`px-3 py-1 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                isActive ? 'bg-blue-600 border-blue-500' : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1"><input type="checkbox" checked={useLower} onChange={(e) => { clearPresetSelection(); setUseLower(e.target.checked); }} /> Lowercase</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={useUpper} onChange={(e) => { clearPresetSelection(); setUseUpper(e.target.checked); }} /> Uppercase</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={useNumbers} onChange={(e) => { clearPresetSelection(); setUseNumbers(e.target.checked); }} /> Numbers</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={useSymbols} onChange={(e) => { clearPresetSelection(); setUseSymbols(e.target.checked); }} /> Symbols</label>
      </div>
      <div className="flex space-x-2 items-center">
        <input
          data-testid="password-display"
          type="text"
          readOnly
          value={password}
          className="flex-1 text-black px-2 py-1 font-mono leading-[1.2] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        />
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-3 py-1 bg-blue-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        >
          Copy
        </button>
      </div>
      {copied && <div className="text-sm text-green-400">Copied!</div>}
      <div>
        <div className="h-2 w-full bg-gray-700 rounded">
          <div className={`h-full ${color} rounded`} style={{ width }} />
        </div>
        <div className="text-sm mt-1 flex items-center gap-2">
          <span>
            Entropy: {entropy.toFixed(1)} bits {label && `(${label})`}
          </span>
          <span
            className="text-xs text-blue-300 cursor-help"
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
          className="w-full px-4 py-2 bg-green-600 rounded"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default PasswordGenerator;
