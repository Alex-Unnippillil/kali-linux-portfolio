import React, { useState } from 'react';
import ExternalFrame from './ExternalFrame';

const DOCS_URL = 'https://github.com/beefproject/beef/wiki';
const ALLOWLIST = ['https://github.com'];

export default function BeefDocs() {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-xl mb-2">Browser Exploitation Framework (BeEF)</h1>
      <p className="mb-4">
        BeEF is a penetration testing tool that focuses on the web browser.
        Use it only on systems you own or have explicit permission to test.
      </p>
      <ul className="list-disc pl-5 space-y-1 mb-4">
        <li>
          <a
            href="https://github.com/beefproject/beef/wiki/Getting-Started"
            className="text-ubt-gedit-blue underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Getting Started Guide
          </a>
        </li>
        <li>
          <a
            href="https://github.com/beefproject/beef/wiki"
            className="text-ubt-gedit-blue underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Full Documentation
          </a>
        </li>
      </ul>
      <button
        type="button"
        onClick={() => setShowDocs(true)}
        className="px-4 py-2 bg-ub-primary rounded"
      >
        Open official docs
      </button>
      {showDocs && (
        <div className="mt-4 h-full">
          <ExternalFrame
            src={DOCS_URL}
            title="BeEF Documentation"
            className="w-full h-full"
            allowlist={ALLOWLIST}
          />
        </div>
      )}
    </div>
  );
}
