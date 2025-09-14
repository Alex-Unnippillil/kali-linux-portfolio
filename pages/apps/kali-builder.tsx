import React, { useState } from 'react';
import presetsData from '../../data/kali-presets.json';

interface Preset {
  name: string;
  baseImage: string;
  metapackages: string[];
  customKernel?: boolean;
  persistence?: boolean;
}

const baseImages = ['kali-rolling', 'kali-last-snapshot'];
const metapackageOptions = [
  { id: 'core', label: 'Core' },
  { id: 'top10', label: 'Top 10' },
  { id: 'wireless', label: 'Wireless' },
  { id: 'forensics', label: 'Forensics' },
];

const KaliBuilder: React.FC = () => {
  const presets = presetsData as Preset[];

  const [baseImage, setBaseImage] = useState('');
  const [metapackages, setMetapackages] = useState<string[]>([]);
  const [customKernel, setCustomKernel] = useState(false);
  const [persistence, setPersistence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      setBaseImage(preset.baseImage);
      setMetapackages(preset.metapackages);
      setCustomKernel(!!preset.customKernel);
      setPersistence(!!preset.persistence);
    }
  };

  const toggleMetapackage = (pkg: string) => {
    setMetapackages((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseImage) {
      setError('Base image is required');
      return;
    }
    if (metapackages.length === 0) {
      setError('Select at least one metapackage');
      return;
    }
    setError(null);
    // Simulation: Normally build process would start here
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Kali Builder</h1>
      <form onSubmit={onSubmit}>
        <label className="block mb-2">
          Preset
          <select
            data-testid="preset-select"
            defaultValue=""
            onChange={(e) => applyPreset(e.target.value)}
            className="ml-2 border"
          >
            <option value="" disabled>
              Select preset
            </option>
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-2">
          Base Image
          <select
            data-testid="base-image"
            className="ml-2 border"
            value={baseImage}
            onChange={(e) => setBaseImage(e.target.value)}
          >
            <option value="">Select</option>
            {baseImages.map((img) => (
              <option key={img} value={img}>
                {img}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mb-2">
          <legend>Metapackages</legend>
          {metapackageOptions.map((pkg) => (
            <div key={pkg.id} className="block">
              <input
                id={`meta-${pkg.id}`}
                type="checkbox"
                data-testid={`meta-${pkg.id}`}
                checked={metapackages.includes(pkg.id)}
                onChange={() => toggleMetapackage(pkg.id)}
                aria-label={pkg.label}
              />
              <label htmlFor={`meta-${pkg.id}`} className="ml-1">
                {pkg.label}
              </label>
            </div>
          ))}
        </fieldset>

        <div className="block">
          <input
            id="custom-kernel"
            type="checkbox"
            data-testid="custom-kernel"
            checked={customKernel}
            onChange={(e) => setCustomKernel(e.target.checked)}
            aria-label="Include Custom Kernel"
          />
          <label htmlFor="custom-kernel" className="ml-1">
            Include Custom Kernel
          </label>
        </div>

        <div className="block mb-2">
          <input
            id="persistence"
            type="checkbox"
            data-testid="persistence"
            checked={persistence}
            onChange={(e) => setPersistence(e.target.checked)}
            aria-label="Enable Persistence"
          />
          <label htmlFor="persistence" className="ml-1">
            Enable Persistence
          </label>
        </div>

        {error && (
          <p data-testid="error" role="alert" className="text-red-500">
            {error}
          </p>
        )}

        <button type="submit" className="mt-2 px-2 py-1 border">
          Build
        </button>
      </form>
    </div>
  );
};

export default KaliBuilder;
