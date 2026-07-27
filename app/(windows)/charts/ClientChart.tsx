'use client';

const chartData = [
  { label: 'Recon', value: 75 },
  { label: 'Exploit', value: 55 },
  { label: 'Post', value: 35 },
  { label: 'Report', value: 90 },
];

export default function ClientChart() {
  return (
    <section className="flex h-full w-full flex-col justify-center gap-4 p-6">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-100">Engagement coverage</h1>
        <p className="text-sm text-slate-400">
          Simulated coverage percentages across the offensive security kill chain.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        {chartData.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-32 text-sm font-medium text-slate-300">{label}</span>
            <div className="flex-1 rounded bg-slate-800" aria-hidden="true">
              <div
                className="h-3 rounded bg-cyan-500 transition-[width]"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs tabular-nums text-slate-400">{value}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
