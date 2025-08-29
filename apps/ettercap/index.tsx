'use client';

import FilterEditor from './components/FilterEditor';

export default function EttercapPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Ettercap Filter Editor</h1>
      <FilterEditor />
    </div>
  );
}

