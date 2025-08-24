import React, { useState, useEffect } from 'react';
import ExternalFrame from '../ExternalFrame';

interface TestDef {
  id: string;
  label: string;
  src: (name: string) => string;
}

const TESTS: TestDef[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    src: (name: string) => `https://samesite-sandbox.vercel.app/navigation?name=${encodeURIComponent(name)}`,
  },
  {
    id: 'subrequest',
    label: 'Subrequest',
    src: (name: string) => `https://samesite-sandbox.vercel.app/subrequest?name=${encodeURIComponent(name)}`,
  },
  {
    id: 'post',
    label: 'POST',
    src: (name: string) => `https://samesite-sandbox.vercel.app/post?name=${encodeURIComponent(name)}`,
  },
];

interface Results {
  [key: string]: boolean | null;
}

const SameSiteLab: React.FC = () => {
  const [cookieName, setCookieName] = useState('labCookie');
  const [sameSite, setSameSite] = useState<'Lax' | 'Strict' | 'None'>('Lax');
  const [results, setResults] = useState<Results>({
    navigation: null,
    subrequest: null,
    post: null,
  });

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { test, result } = e.data as { test?: string; result?: boolean };
      if (test && Object.prototype.hasOwnProperty.call(results, test)) {
        setResults((prev) => ({ ...prev, [test]: result ?? false }));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLabCookie = () => {
    const attributes = [`SameSite=${sameSite}`, 'Path=/'];
    if (sameSite === 'None') attributes.push('Secure');
    document.cookie = `${cookieName}=1; ${attributes.join('; ')}`;
    setResults({ navigation: null, subrequest: null, post: null });
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          className="text-black p-1"
          value={cookieName}
          onChange={(e) => setCookieName(e.target.value)}
        />
        <select
          className="text-black p-1"
          value={sameSite}
          onChange={(e) => setSameSite(e.target.value as 'Lax' | 'Strict' | 'None')}
        >
          <option value="Lax">Lax</option>
          <option value="Strict">Strict</option>
          <option value="None">None</option>
        </select>
        <button
          type="button"
          onClick={setLabCookie}
          className="px-2 bg-blue-600 rounded"
        >
          Set Cookie
        </button>
      </div>
      <table className="text-sm">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left">Context</th>
            <th className="px-2 py-1">Result</th>
          </tr>
        </thead>
        <tbody>
          {TESTS.map((t) => (
            <tr key={t.id} className="odd:bg-gray-800">
              <td className="px-2 py-1">{t.label}</td>
              <td className="px-2 py-1 text-center">
                {results[t.id] === null ? '—' : results[t.id] ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {TESTS.map((t) => (
        <ExternalFrame
          key={t.id}
          title={t.label}
          src={`${t.src(cookieName)}&samesite=${sameSite}`}
          className="hidden"
        />
      ))}
    </div>
  );
};

export default SameSiteLab;
export const displaySameSiteLab = () => <SameSiteLab />;

