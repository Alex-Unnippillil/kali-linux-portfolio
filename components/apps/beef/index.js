import React, { useState } from 'react';
import ExternalFrame from './ExternalFrame';

const DOCS_URL = 'https://github.com/beefproject/beef/wiki';
const ALLOWLIST = ['github.com', 'beefproject.com'];

export default function Beef() {
  const [showDocs, setShowDocs] = useState(false);

  const openDocs = () => {
    try {
      const { hostname } = new URL(DOCS_URL);
      if (ALLOWLIST.includes(hostname)) {
        setShowDocs(true);
      }
    } catch {
      // ignore malformed URL
    }
  };

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-ub-cool-grey text-white">
      <h1 className="text-2xl font-bold mb-4">BeEF Browser Exploitation Framework</h1>
      <p className="mb-4">
        The Browser Exploitation Framework (BeEF) is a penetration testing tool focused on the web
        browser. The following resources provide educational information about BeEF.
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>
          <a
            href="https://beefproject.com"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            BeEF Official Site
          </a>
        </li>
        <li>
          <a
            href="https://github.com/beefproject/beef/wiki"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            BeEF Documentation
          </a>
        </li>
        <li>
          <a
            href="https://github.com/beefproject/beef"
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 underline"
          >
            BeEF GitHub Repository
          </a>
        </li>
      </ul>
      <p className="mb-4 text-sm">
        <strong>Legal disclaimer:</strong> Use BeEF only for lawful research and with explicit
        authorization. Unauthorized access to systems is prohibited and may be illegal.
      </p>
      <button
        type="button"
        onClick={openDocs}
        className="px-3 py-2 bg-ub-primary text-white rounded"
      >
        Open official docs
      </button>
      {showDocs && <ExternalFrame src={DOCS_URL} title="BeEF Documentation" />}
    </div>
  );
}
