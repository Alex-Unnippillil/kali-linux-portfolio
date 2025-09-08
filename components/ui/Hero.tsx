import React from 'react';

interface MetaItem {
  label: string;
  value: React.ReactNode;
}

interface HeroProps {
  title: string;
  summary: string[];
  meta?: MetaItem[];
}

export default function Hero({ title, summary, meta }: HeroProps) {
  return (
    <section className="flex flex-col gap-6 md:flex-row md:gap-4">
      <div className="flex-1 space-y-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        <ul className="list-disc list-inside space-y-2">
          {summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {meta && meta.length > 0 && (
        <aside className="md:w-64 border rounded p-4 space-y-2">
          {meta.map((item) => (
            <div key={item.label} className="flex justify-between gap-2 text-sm">
              <span className="font-medium">{item.label}</span>
              <span className="text-right">{item.value}</span>
            </div>
          ))}
        </aside>
      )}
    </section>
  );
}

