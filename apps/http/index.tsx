'use client';

import React, { useState } from 'react';
import LegalInterstitial from '../../components/ui/LegalInterstitial';

const HTTPPreview: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');

  const command = `curl -X ${method} ${url}`.trim();

  if (!accepted) {
    return <LegalInterstitial onAccept={() => setAccepted(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 text-white">
      <h1 className="mb-4 text-2xl">HTTP Request Builder</h1>
      <p className="mb-4 text-sm text-yellow-300">
        Build a curl command without sending any requests. Learn more at{' '}
        <a
          href="https://curl.se/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-400"
        >
          the curl project page
        </a>
        .
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mb-4 space-y-4">
        <div>
          <label htmlFor="http-method" className="mb-1 block text-sm font-medium">
            Method
          </label>
          <select
            id="http-method"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label htmlFor="http-url" className="mb-1 block text-sm font-medium">
            URL
          </label>
          <input
            id="http-url"
            type="text"
            className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-white"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      </form>
      <div>
        <h2 className="mb-2 text-lg">Command Preview</h2>
        <pre className="overflow-auto rounded bg-black p-2 font-mono text-green-400">
          {command || '# Fill in the form to generate a command'}
        </pre>
      </div>
    </div>
  );
};

export default HTTPPreview;
