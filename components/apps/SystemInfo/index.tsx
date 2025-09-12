'use client';

import { useEffect, useState } from 'react';

const gatherInfo = () => ({
  'User Agent': navigator.userAgent,
  Platform: navigator.platform,
  Language: navigator.language,
  'Cookies Enabled': String(navigator.cookieEnabled),
  'Screen Size': `${window.screen.width}x${window.screen.height}`,
  'Window Size': `${window.innerWidth}x${window.innerHeight}`,
  'Time Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const SystemInfo: React.FC = () => {
  const [info, setInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setInfo(gatherInfo());
    } catch {
      setInfo({});
    }
  }, []);

  const copyInfo = () => {
    const text = Object.entries(info)
      .map(([key, val]) => `${key}: ${val}`)
      .join('\n');
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div className="p-4 space-y-2 text-white bg-ub-cool-grey h-full overflow-auto">
      <div className="space-y-1">
        {Object.entries(info).map(([key, val]) => (
          <div key={key} className="flex gap-2">
            <span className="font-semibold">{key}:</span>
            <span className="break-all">{val}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={copyInfo}
        aria-label="Copy info"
        className="mt-4 p-1 bg-gray-700 hover:bg-gray-600 rounded"
      >
        <CopyIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export default SystemInfo;

