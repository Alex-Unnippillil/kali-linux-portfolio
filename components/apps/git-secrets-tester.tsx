import React, { useState, useEffect } from 'react';

interface MatchInfo {
  pattern: string;
  match: string;
  index: number;
  groups: string[];
  error?: string;
}

const GitSecretsTester: React.FC = () => {
  const [patterns, setPatterns] = useState('');
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [falsePositives, setFalsePositives] = useState<MatchInfo[]>([]);

  useEffect(() => {
    const res: MatchInfo[] = [];
    patterns.split('\n').forEach((pat) => {
      const p = pat.trim();
      if (!p) return;
      try {
        const re = new RegExp(p, 'g');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          res.push({
            pattern: p,
            match: m[0],
            index: m.index,
            groups: m.slice(1),
          });
        }
      } catch (e: any) {
        res.push({ pattern: p, match: '', index: -1, groups: [], error: e.message });
      }
    });
    setMatches(res);
  }, [patterns, text]);

  const markFalsePositive = (m: MatchInfo) => {
    setFalsePositives((prev) => [...prev, m]);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <textarea
        className="w-full h-24 p-2 bg-black text-green-200 font-mono"
        placeholder="Enter regex patterns, one per line"
        value={patterns}
        onChange={(e) => setPatterns(e.target.value)}
      />
      <textarea
        className="w-full h-32 p-2 bg-black text-green-200 font-mono"
        placeholder="Sample text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex-1 overflow-auto space-y-2">
        {matches.map((m, idx) => (
          <div key={idx} className="p-2 bg-gray-800 rounded">
            {m.error ? (
              <div className="text-red-400">
                {m.pattern}: {m.error}
              </div>
            ) : (
              <>
                <div>
                  <span className="font-mono">{m.pattern}</span> matched &quot;
                  <span className="bg-yellow-600 text-black">{m.match}</span>&quot; at {m.index}
                </div>
                {m.groups.length > 0 && (
                  <ul className="ml-4 list-disc">
                    {m.groups.map((g, gi) => (
                      <li key={gi}>
                        Group {gi + 1}: <span className="font-mono">{g || '(empty)'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="mt-2 px-2 py-1 bg-blue-600 rounded"
                  onClick={() => markFalsePositive(m)}
                >
                  Mark false positive
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {falsePositives.length > 0 && (
        <div className="bg-yellow-900 p-2 overflow-auto rounded">
          <strong>False Positives:</strong>
          <ul className="list-disc ml-4">
            {falsePositives.map((fp, idx) => (
              <li key={idx}>
                <span className="font-mono">{fp.pattern}</span> - &quot;
                <span className="bg-yellow-600 text-black">{fp.match}</span>&quot; at {fp.index}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GitSecretsTester;

export const displayGitSecretsTester = () => {
  return <GitSecretsTester />;
};

