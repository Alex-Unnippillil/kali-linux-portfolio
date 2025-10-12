'use client';

import DemoRunner from './components/DemoRunner';

export default function GhidraPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/80 p-4 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.65)]">
        <DemoRunner />
      </div>
    </div>
  );
}
