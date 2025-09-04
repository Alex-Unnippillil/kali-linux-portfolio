"use client";

import { useEffect, useState } from 'react';
import pkg from '../../package.json';

interface Props {
  open: boolean;
  onClose: () => void;
}

const AboutDialog = ({ open, onClose }: Props) => {
  const [gpuInfo, setGpuInfo] = useState('Detecting...');

  useEffect(() => {
    let mounted = true;
    async function detectGpu() {
      if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
        try {
          const adapter: GPUAdapter | null = await (navigator as any).gpu.requestAdapter();
          const info = (adapter as any)?.requestAdapterInfo
            ? await (adapter as any).requestAdapterInfo()
            : null;
          const text = info
            ? `${info.vendor || ''} ${info.architecture || info.description || ''}`.trim()
            : (adapter as any)?.name || 'Unknown GPU';
          if (mounted) setGpuInfo(text);
        } catch (e) {
          if (mounted) setGpuInfo('Unavailable');
        }
      } else {
        if (mounted) setGpuInfo('Not supported');
      }
    }
    detectGpu();
    return () => {
      mounted = false;
    };
  }, []);

  if (!open) return null;

  const commit =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_COMMIT_HASH ||
    'unknown';

  return (
    <div
      role="dialog"
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-4 rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg mb-2">About</h2>
        <p>Version: {pkg.version}</p>
        <p>Commit: {commit}</p>
        <p>GPU: {gpuInfo}</p>
        <button
          className="mt-4 px-2 py-1 bg-blue-500 text-white"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AboutDialog;

