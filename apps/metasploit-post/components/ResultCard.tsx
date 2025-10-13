import React from 'react';

interface ResultCardProps {
  title: string;
  output: string;
}

const ResultCard: React.FC<ResultCardProps> = ({ title, output }) => {
  const copy = () => navigator.clipboard.writeText(output);
  return (
    <div className="mb-2 rounded border border-[color:var(--kali-panel-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent)] p-3 shadow-[0_0_0_1px_rgba(15,148,210,0.08)]">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold">{title}</h4>
        <button
          onClick={copy}
          className="rounded px-2 py-1 text-xs font-medium text-[color:var(--color-dark)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--kali-control)]"
          style={{ background: 'var(--kali-control)' }}
        >
          Copy
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] p-3 text-[color:var(--color-text)]">{output}</pre>
    </div>
  );
};

export default ResultCard;
