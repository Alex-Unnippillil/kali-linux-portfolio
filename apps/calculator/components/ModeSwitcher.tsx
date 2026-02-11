export type Mode = 'basic' | 'scientific' | 'programmer';

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const MODES: Mode[] = ['basic', 'scientific', 'programmer'];

export default function ModeSwitcher({ mode, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_70%,transparent)]">
      <span>Mode</span>
      <select
        aria-label="calculator mode"
        value={mode}
        onChange={(event) => onChange(event.target.value as Mode)}
        className="rounded-lg border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-1 text-sm text-[color:var(--kali-text)]"
      >
        {MODES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
