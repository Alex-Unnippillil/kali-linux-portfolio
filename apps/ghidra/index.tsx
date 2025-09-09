'use client';

import dynamic from 'next/dynamic';

const DemoRunner = dynamic(() => import('./components/DemoRunner'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function GhidraPage() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <h1 className="sr-only">Ghidra demo</h1>
      <DemoRunner />
    </div>
  );
}
