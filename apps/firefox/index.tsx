'use client';

import Firefox from '../../components/apps/firefox';

const FirefoxPage = () => (
  <main className="flex min-h-screen flex-col bg-ub-cool-grey text-gray-100">
    <div className="flex flex-1 flex-col p-4 sm:p-6">
      <div className="flex h-full min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border border-black/40 bg-ub-grey shadow-xl">
        <Firefox />
      </div>
    </div>
  </main>
);

export default FirefoxPage;
