import React, { useState } from 'react';

const OpenRedirectLab: React.FC = () => {
  const [next, setNext] = useState('');
  const [allowList, setAllowList] = useState('https://example.com, https://kali.org');
  const [status, setStatus] = useState<'safe' | 'blocked' | null>(null);

  const testRedirect = () => {
    const list = allowList
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const allowed = list.some((u) => next.startsWith(u));
    setStatus(allowed ? 'safe' : 'blocked');
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white space-y-4 overflow-auto">
      <div>
        <label className="block text-sm mb-1">next parameter</label>
        <input
          type="text"
          className="w-full p-2 text-black"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="https://example.com/dashboard"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Allow list (comma separated)</label>
        <input
          type="text"
          className="w-full p-2 text-black"
          value={allowList}
          onChange={(e) => setAllowList(e.target.value)}
          placeholder="https://example.com, https://kali.org"
        />
      </div>
      <button
        type="button"
        onClick={testRedirect}
        className="px-4 py-2 bg-blue-600 rounded"
      >
        Test Redirect
      </button>
      {status && (
        <div className="mt-4">
          {status === 'safe' ? (
            <p className="text-green-400">Redirecting to {next}</p>
          ) : (
            <p className="text-red-400">Blocked: {next} is not allowed</p>
          )}
          <p className="text-gray-300 text-sm mt-2">
            The allow list validation checks whether the <code>next</code> URL
            begins with a trusted value. Only URLs that start with an allow-listed
            prefix are followed, preventing open redirect attacks.
          </p>
        </div>
      )}
    </div>
  );
};

export default OpenRedirectLab;

