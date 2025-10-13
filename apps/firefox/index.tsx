'use client';

import Firefox from '../../components/apps/firefox';

const FirefoxPage = () => (
  <main className="flex min-h-screen flex-col bg-[var(--kali-bg)] text-[color:var(--kali-text)]">
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex h-full min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-surface)] shadow-[0_32px_64px_-20px_var(--kali-blue-glow)]">
        <Firefox />
      </div>
    </div>
  </main>
);

export default FirefoxPage;
