import React, { useState } from 'react';

// Minimal mapping of MITRE ATT&CK tactics to example techniques
const TACTICS: Record<string, string[]> = {
  Reconnaissance: ['Search Victim-Owned Websites', 'Gather Victim Org Info'],
  Execution: ['Command and Scripting Interpreter', 'Native API'],
  Persistence: ['Boot or Logon Autostart Execution', 'Account Manipulation'],
};

type Tactic = keyof typeof TACTICS;

const MitreSelector: React.FC = () => {
  const [selectedTactics, setSelectedTactics] = useState<Tactic[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Record<Tactic, string[]>>({});

  const handleTacticChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((o) => o.value as Tactic);
    setSelectedTactics(values);
    setSelectedTechniques((prev) => {
      const next: Record<Tactic, string[]> = {} as Record<Tactic, string[]>;
      values.forEach((t) => {
        next[t] = prev[t] || [];
      });
      return next;
    });
  };

  const handleTechniqueChange = (tactic: Tactic, e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedTechniques((prev) => ({ ...prev, [tactic]: values }));
  };

  const exportJson = () => {
    const data = selectedTactics.map((tactic) => ({
      tactic,
      techniques: selectedTechniques[tactic] || [],
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mitre-selection.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const techniqueSet = new Set<string>();
  selectedTactics.forEach((t) => {
    TACTICS[t].forEach((tech) => techniqueSet.add(tech));
  });
  const allTechniques = Array.from(techniqueSet);

  return (
    <div className="p-4 space-y-4 text-white bg-panel overflow-auto h-full">
      <div>
        <label className="block font-bold mb-1">Tactics</label>
        <select
          multiple
          className="w-full h-32 text-black p-1 border border-gray-300 rounded"
          value={selectedTactics}
          onChange={handleTacticChange}
        >
          {Object.keys(TACTICS).map((tactic) => (
            <option key={tactic} value={tactic}>
              {tactic}
            </option>
          ))}
        </select>
      </div>

      {selectedTactics.map((tactic) => (
        <div key={tactic}>
          <label className="block font-bold mb-1">{tactic} Techniques</label>
          <select
            multiple
            className="w-full h-32 text-black p-1 border border-gray-300 rounded"
            value={selectedTechniques[tactic] || []}
            onChange={(e) => handleTechniqueChange(tactic, e)}
          >
            {TACTICS[tactic].map((tech) => (
              <option key={tech} value={tech}>
                {tech}
              </option>
            ))}
          </select>
        </div>
      ))}

      {selectedTactics.length > 0 && (
        <>
          <div>
            <label className="block font-bold mb-1">Heatmap</label>
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border p-1"></th>
                  {allTechniques.map((tech) => (
                    <th key={tech} className="border p-1">
                      {tech}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedTactics.map((tactic) => (
                  <tr key={tactic}>
                    <td className="border p-1 font-bold">{tactic}</td>
                    {allTechniques.map((tech) => {
                      const active = selectedTechniques[tactic]?.includes(tech);
                      return (
                        <td
                          key={tech}
                          className="border w-6 h-6"
                          style={{ backgroundColor: active ? '#f87171' : '#1f2937' }}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={exportJson}
          >
            Export JSON
          </button>
        </>
      )}
    </div>
  );
};

export default MitreSelector;

export const displayMitreSelector = () => <MitreSelector />;

