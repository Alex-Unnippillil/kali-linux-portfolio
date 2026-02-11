interface TapeEntry { expr: string; result: string }

interface TapeProps {
  entries: TapeEntry[];
  onRecall: (value: string) => void;
}

export default function Tape({ entries, onRecall }: TapeProps) {
  return (
    <div className="max-h-52 space-y-2 overflow-auto rounded-xl border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] p-3">
      {entries.length === 0 ? (
        <p className="text-xs uppercase tracking-[0.2em] text-[color:color-mix(in_srgb,var(--kali-text)_55%,transparent)]">Tape is empty</p>
      ) : entries.map((entry, index) => (
        <div key={`${entry.expr}-${index}`} className="rounded-lg border border-[color:var(--kali-border)]/40 bg-[var(--kali-panel)] px-3 py-2 text-sm">
          <p className="truncate">{entry.expr} = <span className="font-semibold">{entry.result}</span></p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded bg-[var(--kali-overlay)] px-2 py-1 text-xs" onClick={() => onRecall(entry.result)} aria-label="recall result">Recall</button>
            <button type="button" className="rounded bg-[var(--kali-overlay)] px-2 py-1 text-xs" aria-label="copy result" onClick={() => navigator.clipboard?.writeText(entry.result)}>Copy</button>
          </div>
        </div>
      ))}
    </div>
  );
}
