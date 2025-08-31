'use client';

import { useEffect, useState } from 'react';
import { copyToClipboard } from '../../utils/clipboard';
import Link from 'next/link';

export function calculatePrice(scope: number, options: number) {
  const base = 1000;
  return base + scope * 10 + options * 5;
}

export function priceRange(scope: number, options: number) {
  const price = calculatePrice(scope, options);
  return [Math.round(price * 0.9), Math.round(price * 1.1)];
}

export function calculateRisk(scope: number, options: number) {
  return Math.round((scope + options) / 2);
}

const EstimatorApp = () => {
  const [scope, setScope] = useState(50);
  const [options, setOptions] = useState(50);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get('scope') || '', 10);
    const o = parseInt(params.get('options') || '', 10);
    if (!Number.isNaN(s)) setScope(s);
    if (!Number.isNaN(o)) setOptions(o);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('scope', String(scope));
    params.set('options', String(options));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [scope, options]);

  const [low, high] = priceRange(scope, options);
  const risk = calculateRisk(scope, options);
  const riskLevel = risk < 34 ? 'Low' : risk < 67 ? 'Medium' : 'High';
  const riskColor = risk < 34 ? 'bg-green-500' : risk < 67 ? 'bg-yellow-500' : 'bg-red-500';

  const handleCopy = async () => {
    const success = await copyToClipboard(window.location.href);
    setCopied(success);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 text-white space-y-4">
      <h1 className="text-xl">Project Estimator</h1>
      <div>
        <label htmlFor="scope" className="block mb-1">
          Scope: {scope}
        </label>
        <input
          id="scope"
          type="range"
          min={0}
          max={100}
          value={scope}
          onChange={(e) => setScope(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div>
        <label htmlFor="options" className="block mb-1">
          Options: {options}
        </label>
        <input
          id="options"
          type="range"
          min={0}
          max={100}
          value={options}
          onChange={(e) => setOptions(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <div>
        <p>
          Estimated price range: ${low.toLocaleString()} - ${high.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="mb-1">Risk: {riskLevel}</p>
        <div className="w-full h-4 bg-gray-700 rounded">
          <div className={`h-4 ${riskColor} rounded`} style={{ width: `${risk}%` }} />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded bg-blue-600 px-4 py-2"
        >
          {copied ? 'Link copied' : 'Copy shareable link'}
        </button>
        <Link
          href={`/apps/contact?message=${encodeURIComponent(
            `I am interested in a project around $${low}-$${high}`,
          )}`}
          className="underline"
        >
          Start conversation
        </Link>
      </div>
    </div>
  );
};

export default EstimatorApp;
