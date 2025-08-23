import React, { useState, useEffect } from 'react';

const exampleRule = `rule Example {
  strings:
    $a = "test"
  condition:
    $a
}`;

interface MatchDetail {
  rule: string;
  matches: { identifier: string; data: string; offset: number; length: number }[];
}

const YaraTester: React.FC = () => {
  const [yara, setYara] = useState<any>(null);
  const [rules, setRules] = useState(exampleRule);
  const [input, setInput] = useState('');
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [errors, setErrors] = useState<{ message: string; line?: number; warning?: boolean }[]>([]);

  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined') {
      import(/* webpackIgnore: true */ 'libyara-wasm')
        .then((m) => (m.default ? m.default() : m()))
        .then((mod) => {
          if (mounted) setYara(mod);
        })
        .catch(() => {
          // ignore load errors
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = e.target?.result;
      if (typeof res === 'string') setInput(res);
    };
    reader.readAsBinaryString(file);
  };

  const runRules = () => {
    if (!yara) return;
    try {
      const res = yara.run(input, rules);
      const ruleVec = res.matchedRules;
      const found: MatchDetail[] = [];
      for (let i = 0; i < ruleVec.size(); i += 1) {
        const r = ruleVec.get(i);
        const det: MatchDetail['matches'] = [];
        const rm = r.resolvedMatches;
        for (let j = 0; j < rm.size(); j += 1) {
          const m = rm.get(j);
          det.push({
            identifier: m.stringIdentifier,
            data: m.data,
            offset: m.location,
            length: m.matchLength,
          });
        }
        found.push({ rule: r.ruleName, matches: det });
      }
      const errVec = res.compileErrors;
      const errArr: { message: string; line?: number; warning?: boolean }[] = [];
      for (let i = 0; i < errVec.size(); i += 1) {
        const e = errVec.get(i);
        errArr.push({ message: e.message, line: e.lineNumber, warning: e.warning });
      }
      setMatches(found);
      setErrors(errArr);
    } catch (e) {
      setErrors([{ message: String(e) }]);
      setMatches([]);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <textarea
        className="w-full h-32 p-2 bg-black text-green-200 font-mono"
        value={rules}
        onChange={(e) => setRules(e.target.value)}
      />
      <div className="flex space-x-2 items-center">
        <textarea
          className="flex-1 h-24 p-2 bg-black text-green-200 font-mono"
          placeholder="Paste text to scan..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
          onClick={runRules}
          disabled={!yara}
        >
          Run
        </button>
      </div>
      {errors.length > 0 && (
        <div className="bg-red-800 p-2 overflow-auto">
          <strong>Errors:</strong>
          <ul>
            {errors.map((e, idx) => (
              <li key={idx}>{e.line ? `Line ${e.line}: ` : ''}{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {matches.length > 0 && (
        <div className="bg-gray-800 p-2 overflow-auto">
          <strong>Matches:</strong>
          <ul>
            {matches.map((m, idx) => (
              <li key={idx} className="mb-2">
                <div className="font-bold">{m.rule}</div>
                <ul className="ml-4 list-disc">
                  {m.matches.map((d, j) => (
                    <li key={j}>
                      {d.identifier} @ {d.offset} len {d.length}: "{d.data}"
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default YaraTester;

