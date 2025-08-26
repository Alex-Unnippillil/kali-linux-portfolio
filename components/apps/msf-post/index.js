import React, { useEffect, useState } from 'react';

const templates = [
  { name: 'Gather System Info', module: 'post/multi/gather/system_info' },
  { name: 'Windows Hashdump', module: 'post/windows/gather/hashdump' },
];

const MsfPostApp = () => {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [search, setSearch] = useState('');
  const [output, setOutput] = useState('');
  const [reportUrl, setReportUrl] = useState('');

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch('/api/metasploit/modules?type=post');
        const data = await res.json();
        setModules(data.modules || []);
      } catch (err) {
        setModules([]);
      }
    };

    fetchModules();
  }, []);

  const runModule = async () => {
    if (!selected) return;
    setOutput('Running...');
    try {
      const res = await fetch('/api/metasploit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: selected }),
      });
      const data = await res.json();
      const out = data.output || 'No output';
      setOutput(out);
        const markdown = `# Post Exploit Report

## Module: ${selected}

${'```'}
${out}
${'```'}`;
        const blob = new Blob([markdown], { type: 'text/markdown' });
        setReportUrl(URL.createObjectURL(blob));
    } catch (err) {
      setOutput('Error running module');
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg mb-2">Metasploit Post Modules</h2>
      <input
        type="text"
        placeholder="Search modules"
        className="mb-2 p-2 bg-gray-800 rounded"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        data-testid="search-input"
      />
      <select
        className="mb-2 p-2 bg-gray-800 rounded"
        value={selectedTemplate}
        onChange={(e) => {
          setSelectedTemplate(e.target.value);
          setSelected(e.target.value);
        }}
        data-testid="template-select"
      >
        <option value="">Select a template</option>
        {templates.map((t) => (
          <option key={t.module} value={t.module}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex mb-4">
        <select
          className="flex-1 bg-gray-800 p-2 rounded"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          data-testid="module-select"
        >
          <option value="">Select a module</option>
          {modules
            .filter((m) => m.toLowerCase().includes(search.toLowerCase()))
            .map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
        </select>
        <button
          onClick={runModule}
          className="ml-2 px-4 py-2 bg-blue-600 rounded"
          data-testid="run-button"
        >
          Run
        </button>
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
      {reportUrl && (
        <a
          href={reportUrl}
          download="post-exploit-report.md"
          className="mt-2 underline text-blue-400"
          data-testid="download-report"
        >
          Download Report
        </a>
      )}
    </div>
  );
};

export default MsfPostApp;
