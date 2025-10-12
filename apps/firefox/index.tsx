'use client';

import Firefox from '../../components/apps/firefox';

const FirefoxPage = () => (
  <main className="flex min-h-screen flex-col bg-[var(--kali-bg)] text-[var(--kali-text)]">
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex h-full min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[var(--kali-panel)] shadow-kali-panel">
        <Firefox />
      </div>
    </div>
  </main>
);

export default FirefoxPage;
