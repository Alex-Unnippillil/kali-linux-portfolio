'use client';

import React, { useState } from 'react';
import presets from '../../data/kali-presets.json';

interface Preset {
  name: string;
  baseImage: string;
  metapackages: string[];
  kernel?: boolean;
  persistence?: boolean;
}

const METAPACKAGES = ['default', 'top10', 'forensic', 'wireless'];

const KaliBuilder: React.FC = () => {
  const [baseImage, setBaseImage] = useState('');
  const [packages, setPackages] = useState<string[]>([]);
  const [kernel, setKernel] = useState(false);
  const [persistence, setPersistence] = useState(false);
  const [errors, setErrors] = useState<{ baseImage?: string; packages?: string }>({});

  const applyPreset = (presetName: string) => {
    const preset = (presets as Preset[]).find((p) => p.name === presetName);
    if (preset) {
      setBaseImage(preset.baseImage);
      setPackages(preset.metapackages);
      setKernel(!!preset.kernel);
      setPersistence(!!preset.persistence);
    }
  };

  const togglePackage = (pkg: string) => {
    setPackages((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { baseImage?: string; packages?: string } = {};
    if (!baseImage) newErrors.baseImage = 'Base image is required';
    if (packages.length === 0)
      newErrors.packages = 'Select at least one metapackage';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // Placeholder build action
      console.log({ baseImage, packages, kernel, persistence });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 text-black">
      <div>
        <label className="block" htmlFor="preset-select">
          Preset
        </label>
        <select
          id="preset-select"
          className="w-full border p-1"
          defaultValue=""
          onChange={(e) => applyPreset(e.target.value)}
        >
          <option value="">Custom</option>
          {(presets as Preset[]).map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block" htmlFor="base-image">
          Base Image
        </label>
        <select
          id="base-image"
          value={baseImage}
          onChange={(e) => setBaseImage(e.target.value)}
          className="w-full border p-1"
        >
          <option value="">Select</option>
          <option value="kali-rolling">kali-rolling</option>
          <option value="kali-last-snapshot">kali-last-snapshot</option>
        </select>
        {errors.baseImage && (
          <p role="alert" className="text-red-600">
            {errors.baseImage}
          </p>
        )}
      </div>
      <fieldset>
        <legend className="font-medium">Metapackages</legend>
        {METAPACKAGES.map((pkg) => (
          <label key={pkg} className="block">
            <input
              type="checkbox"
              aria-label={pkg}
              checked={packages.includes(pkg)}
              onChange={() => togglePackage(pkg)}
            />{' '}
            {pkg}
          </label>
        ))}
        {errors.packages && (
          <p role="alert" className="text-red-600">
            {errors.packages}
          </p>
        )}
      </fieldset>
      <label className="block">
        <input
          type="checkbox"
          aria-label="Custom kernel"
          checked={kernel}
          onChange={(e) => setKernel(e.target.checked)}
        />{' '}
        Custom kernel
      </label>
      <label className="block">
        <input
          type="checkbox"
          aria-label="Enable persistence"
          checked={persistence}
          onChange={(e) => setPersistence(e.target.checked)}
        />{' '}
        Enable persistence
      </label>
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Build
      </button>
    </form>
  );
};

export default KaliBuilder;
