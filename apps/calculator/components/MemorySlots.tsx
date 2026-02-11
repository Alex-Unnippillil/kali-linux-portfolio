import { useState } from 'react';

interface Props {
  memory: Record<string, string>;
  onStore: (name: string) => void;
  onInsert: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function MemorySlots({ memory, onStore, onInsert, onDelete }: Props) {
  const [name, setName] = useState('');

  return (
    <section className="space-y-2 rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3">
      <div className="flex gap-2">
        <input aria-label="memory variable name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded border border-[color:var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1 text-sm" />
        <button type="button" onClick={() => { onStore(name.trim()); setName(''); }} className="rounded bg-[var(--kali-panel)] px-2 py-1 text-xs">Store</button>
      </div>
      {Object.entries(memory).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <button type="button" onClick={() => onInsert(key)} className="rounded bg-[var(--kali-panel)] px-2 py-1">{key}</button>
          <span className="flex-1 truncate">{value}</span>
          <button type="button" onClick={() => onStore(key)} aria-label={`refresh ${key}`} className="rounded bg-[var(--kali-panel)] px-2 py-1">↻</button>
          <button type="button" onClick={() => onDelete(key)} aria-label={`delete ${key}`} className="rounded bg-[var(--kali-panel)] px-2 py-1">✕</button>
        </div>
      ))}
    </section>
  );
}
