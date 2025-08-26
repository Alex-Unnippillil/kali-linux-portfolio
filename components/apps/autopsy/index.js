import React, { useState } from 'react';
import basicTemplate from './basic.json';
import networkTemplate from './network.json';

const templates = [basicTemplate, networkTemplate];

function Autopsy() {
  const [caseName, setCaseName] = useState('');
  const [examiner, setExaminer] = useState('');
  const [notes, setNotes] = useState('');
  const [template, setTemplate] = useState('');
  const [currentCase, setCurrentCase] = useState(null);
  const [analysis, setAnalysis] = useState('');

  const handleTemplateChange = (e) => {
    const selected = templates.find(
      (t) => t.templateName === e.target.value
    );
    setTemplate(e.target.value);
    if (selected) {
      setCaseName(selected.caseName || '');
      setExaminer(selected.examiner || '');
      setNotes(selected.notes || '');
    } else {
      setCaseName('');
      setExaminer('');
      setNotes('');
    }
  };

  const createCase = () => {
    const name = caseName.trim();
    if (name) {
      setCurrentCase({ caseName: name, examiner: examiner.trim(), notes });
      setAnalysis('');
    }
  };

  const analyseFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      const bytes = new Uint8Array(buffer).slice(0, 20);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      setAnalysis(`File: ${file.name}\nSize: ${file.size} bytes\nFirst 20 bytes: ${hex}`);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex space-x-2">
          <select
            value={template}
            onChange={handleTemplateChange}
            className="bg-ub-grey text-white px-2 py-1 rounded"
          >
            <option value="">Template</option>
            {templates.map((t) => (
              <option key={t.templateName} value={t.templateName}>
                {t.templateName}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            placeholder="Case name"
            className="flex-grow bg-ub-grey text-white px-2 py-1 rounded"
          />
          <input
            type="text"
            value={examiner}
            onChange={(e) => setExaminer(e.target.value)}
            placeholder="Examiner"
            className="flex-grow bg-ub-grey text-white px-2 py-1 rounded"
          />
          <button
            onClick={createCase}
            className="bg-ub-orange px-3 py-1 rounded"
          >
            Create Case
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full bg-ub-grey text-white p-2 rounded resize-none"
          rows={2}
        />
      </div>
      {currentCase && (
        <div className="space-y-2">
          <div className="text-sm">Current case: {currentCase.caseName}</div>
          {currentCase.examiner && (
            <div className="text-xs">Examiner: {currentCase.examiner}</div>
          )}
          {currentCase.notes && (
            <div className="text-xs whitespace-pre-wrap">Notes: {currentCase.notes}</div>
          )}
          <input type="file" onChange={analyseFile} className="text-sm" />
        </div>
      )}
      {analysis && (
        <textarea
          readOnly
          value={analysis}
          className="flex-grow bg-ub-grey text-xs text-white p-2 rounded resize-none"
        />
      )}
    </div>
  );
}

export default Autopsy;

export const displayAutopsy = () => <Autopsy />;

