import React, { useMemo } from 'react';

const PluginScoreHeatmap = ({ findings = [] }) => {
  const data = useMemo(() => {
    const map = new Map();
    findings.forEach((f) => {
      if (typeof f.cvss !== 'number') return;
      const current = map.get(f.name) || { name: f.name, total: 0, count: 0 };
      current.total += f.cvss;
      current.count += 1;
      map.set(f.name, current);
    });
    const aggregated = Array.from(map.values()).map(({ name, total, count }) => ({
      name,
      avg: total / count,
    }));
    aggregated.sort((a, b) => b.avg - a.avg);
    return aggregated;
  }, [findings]);

  if (data.length === 0) {
    return <div className="text-sm text-gray-400">No plugin scores available.</div>;
  }

  return (
    <div className="my-4">
      <h3 className="text-lg mb-2">Plugin Score Heatmap</h3>
      <ul className="space-y-1">
        {data.map(({ name, avg }) => {
          const hue = (1 - avg / 10) * 120;
          return (
            <li key={name} className="flex items-center">
              <span className="w-48 truncate mr-2 text-sm">{name}</span>
              <div
                className="flex-1 h-4"
                role="img"
                aria-label={`${name} average score ${avg.toFixed(1)}`}
                style={{
                  backgroundColor: `hsl(${hue}, 70%, 50%)`,
                  width: `${(avg / 10) * 100}%`,
                }}
              />
              <span className="ml-2 text-sm">{avg.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PluginScoreHeatmap;
