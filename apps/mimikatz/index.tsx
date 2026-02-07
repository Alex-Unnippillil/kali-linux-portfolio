'use client';

import React, { useState } from 'react';
import MimikatzApp from '../../components/apps/mimikatz';
import ExposureExplainer from './components/ExposureExplainer';
import { KALI_SITES } from '@/src/config/kaliSites';

const disclaimerUrl = `${KALI_SITES.BASE}/docs/policy/disclaimer/`;

const MimikatzPage: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 text-kali-text"
        style={{ backgroundColor: 'var(--kali-overlay)' }}
      >
        <div className="max-w-md space-y-4 rounded-xl border border-kali-border/60 bg-[var(--kali-panel)] p-6 text-center shadow-lg shadow-kali-panel">
          <h2 className="text-xl font-bold">High-Risk Command Warning</h2>
          <p>
            Mimikatz can execute high-risk commands that may compromise system
            security. Proceed only if you understand the risks.
          </p>
          <a
            href={disclaimerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-kali-accent underline hover:text-kali-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
          >
            Read the full disclaimer
          </a>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setConfirmed(true)}
              className="rounded-lg bg-kali-accent px-4 py-2 font-semibold text-kali-inverse shadow transition hover:bg-kali-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Proceed
            </button>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-kali-border/70 bg-kali-muted px-4 py-2 font-semibold text-kali-text transition hover:bg-kali-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MimikatzApp />
      <ExposureExplainer />
    </>
  );
};

export default MimikatzPage;

