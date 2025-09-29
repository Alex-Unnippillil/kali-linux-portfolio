import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import type {
  SimulatorParserRequest,
  SimulatorParserResponse,
  ParsedLine,
} from '../../workers/simulatorParser.worker';
import ErrorFixSuggestions from '@/components/ui/ErrorFixSuggestions';
import { detectErrorCodes } from '@/utils/errorFixes';
interface TabDefinition { id: string; title: string; content: React.ReactNode; }

const LAB_BANNER = 'For lab use only. Commands are never executed.';

const samples: Record<string, string> = {
  'Interface down (NET-042)': [
    'timestamp:2024-03-02T10:14:00Z',
    'status:error',
    'code:NET-042',
    'interface:wlan0',
    'detail:Interface reported DOWN during capture',
  ].join('\n'),
  'Stale SSH host (AUTH-013)': [
    'timestamp:2024-03-04T08:11:21Z',
    'status:error',
    'code:AUTH-013',
    'target:kali.lab.internal',
    'detail:Host key verification failed',
  ].join('\n'),
  'Volatile journal (LOG-200)': [
    'timestamp:2024-03-06T17:45:09Z',
    'status:warn',
    'code:LOG-200',
    'service:systemd-journald',
    'detail:Runtime directory detected; persistence disabled',
  ].join('\n'),
};

const Simulator: React.FC = () => {
  const [labMode, setLabMode] = usePersistentState('simulator:labMode', false);
  const [prefs, setPrefs] = usePersistentState('desktop:simulator:prefs', { scenario: '', inputs: '', columns: [] as string[] });
  const [command, setCommand] = usePersistentState('simulator:lastCommand', '');
  const [fixtureText, setFixtureText] = useState('');
  const [parsed, setParsed] = useState<ParsedLine[]>([]);
  const [filter, setFilter] = useState('');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(0);
  const workerRef = useRef<Worker|null>(null);
  const [activeTab, setActiveTab] = useState('raw');
  const [sortCol, setSortCol] = useState<'line'|'key'|'value'>('line');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const errorCodes = useMemo(() => {
    const codes: string[] = [];
    parsed.forEach((entry) => {
      if (entry.key.toLowerCase().includes('code')) {
        codes.push(entry.value);
      }
    });
    detectErrorCodes(fixtureText).forEach((code) => codes.push(code));
    return Array.from(new Set(codes));
  }, [parsed, fixtureText]);

  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/simulatorParser.worker.ts', import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<SimulatorParserResponse>) => {
      const data = e.data;
      if (data.type === 'progress') {
        setProgress(data.progress);
        setEta(data.eta);
      } else if (data.type === 'done') {
        setParsed(data.parsed);
        setProgress(1);
        setEta(0);
      }
    };
    return () => worker.terminate();
  }, []);

  const parseText = useCallback((text: string) => {
    setFixtureText(text);
    setParsed([]);
    setProgress(0);
    setEta(0);
    workerRef.current?.postMessage({ action: 'parse', text } as SimulatorParserRequest);
  }, []);

  const cancelParse = () =>
    workerRef.current?.postMessage({ action: 'cancel' } as SimulatorParserRequest);

  const onSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val && samples[val]) {
      parseText(samples[val]);
      setPrefs({ ...prefs, scenario: val });
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      parseText(text);
      setPrefs({ ...prefs, scenario: file.name });
    };
    reader.readAsText(file);
  };

  const copyCommand = async () => {
    try { await navigator.clipboard.writeText(command); } catch {}
  };

  const handleRunFix = useCallback((cmd: string) => {
    setCommand(cmd);
  }, [setCommand]);

  const filtered = useCallback(() => {
    const rows = filter
      ? parsed.filter(p => p.raw.toLowerCase().includes(filter.toLowerCase()))
      : [...parsed];
    return rows.sort((a,b) => {
      const va = a[sortCol];
      const vb = b[sortCol];
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [parsed, filter, sortCol, sortDir]);

  const sortBy = (col: 'line'|'key'|'value') => {
    setSortCol(col);
    setSortDir(col === sortCol && sortDir === 'asc' ? 'desc' : 'asc');
  };

  const exportCSV = () => {
    const rows = ['line,key,value'];
    filtered().forEach(p => rows.push(`${p.line},${p.key},${p.value}`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parsed.csv';
    a.click();
    URL.revokeObjectURL(url);
  };



  // Previously a chart visualization tab used Chart.js here.
  // The dependency caused build failures, so the chart feature was removed
  // to keep the simulator lightweight and avoid installation errors.


  const tabs: TabDefinition[] = [
    { id: 'raw', title: 'Raw', content: <pre className="p-2 overflow-auto" aria-label="Raw output">{fixtureText}</pre> },
    {
      id: 'parsed',
      title: 'Parsed',
      content: (
        <div className="p-2 space-y-2">
          <div className="flex items-center space-x-2">
            <input aria-label="Filter rows" className="border p-1 flex-grow" value={filter} onChange={(e)=>setFilter(e.target.value)} />
            <button className="px-2 py-1 bg-gray-200" onClick={exportCSV} aria-label="Export CSV">CSV</button>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 200 }}>
            <table className="min-w-full text-sm" aria-label="Parsed table">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={()=>sortBy('line')}>Line</th>
                  <th className="cursor-pointer" onClick={()=>sortBy('key')}>Key</th>
                  <th className="cursor-pointer" onClick={()=>sortBy('value')}>Value</th>
                </tr>
              </thead>
              <tbody>
                {filtered().map(p => (
                  <tr key={p.line} className="odd:bg-gray-100">
                    <td>{p.line}</td>
                    <td>{p.key}</td>
                    <td>{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    },

  ];

  return (
    <div className="space-y-4" aria-label="Simulator">
      <div className="flex items-center">
        <label className="flex items-center space-x-2 font-semibold">
          <input id="labmode" aria-labelledby="labmode-label" type="checkbox" checked={labMode} onChange={e=>setLabMode(e.target.checked)} />
          <span id="labmode-label">Lab Mode</span>
        </label>
      </div>
      {!labMode && (
        <div className="bg-yellow-100 text-yellow-800 p-2" role="alert">
          {LAB_BANNER}
        </div>
      )}
      <div className="space-y-2" aria-label="Command builder">
        <input aria-label="Command input" className="border p-1 w-full" value={command} onChange={e=>setCommand(e.target.value)} />
        <button className="px-2 py-1 bg-blue-600 text-white" onClick={copyCommand} aria-label="Copy command">Copy</button>
      </div>
      <div className="space-y-2" aria-label="Fixture loader">
        <select onChange={onSampleChange} value={prefs.scenario} aria-label="Sample fixtures">
          <option value="">Select sample</option>
          {Object.keys(samples).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
        <input type="file" accept=".txt,.json" onChange={onFile} aria-label="Load file" />
      </div>
      {fixtureText && (
        <>
          <div className="border rounded" aria-label="Results">
            <div className="flex border-b" role="tablist">
              {tabs.map(t => (
                <button key={t.id} role="tab" className={`px-2 py-1 ${activeTab===t.id ? 'bg-gray-200':''}`} onClick={()=>setActiveTab(t.id)}>
                  {t.title}
                </button>
              ))}
            </div>
            <div>{tabs.find(t=>t.id===activeTab)?.content}</div>
          </div>
          {errorCodes.length > 0 && (
            <ErrorFixSuggestions
              codes={errorCodes}
              onRunCommand={handleRunFix}
              source="simulator"
            />
          )}
        </>
      )}
      {progress > 0 && progress < 1 && (
        <div aria-label="Parsing progress" className="space-y-1">
          <div className="w-full bg-gray-200 h-2">
            <div className="bg-blue-500 h-2" style={{ width: `${(progress*100).toFixed(0)}%` }} />
          </div>
          <div className="text-sm">ETA: {eta.toFixed(0)}ms</div>
          <button className="px-2 py-1 bg-red-600 text-white" onClick={cancelParse} aria-label="Cancel parse">Cancel</button>
        </div>
      )}
      <div aria-label="Explainer" className="space-y-1">
        {parsed.map(p => (
          <div key={p.line} className="text-sm">
            <span className="font-mono bg-gray-100 mr-2 px-1">{p.line}</span>
            {p.raw}
            {p.key && (
              <a className="ml-2 text-blue-600 underline" href={`https://example.com/search?q=${encodeURIComponent(p.key)}`} target="_blank" rel="noopener noreferrer">docs</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Simulator;
