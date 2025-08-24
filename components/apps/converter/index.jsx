import React, { useState, useEffect } from 'react';
import UnitConverter from './UnitConverter';
import EncodingConverter from './EncodingConverter';
import TextTransform from './TextTransform';

const plugins = [
  { id: 'unit', title: 'Units', component: UnitConverter },
  { id: 'encoding', title: 'Encodings', component: EncodingConverter },
  { id: 'text', title: 'Text', component: TextTransform },
];

const Converter = () => {
  const [active, setActive] = useState(plugins[0].id);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('converter-history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('converter-history', JSON.stringify(history));
    } catch (_) {
      // ignore
    }
  }, [history]);

  const addHistory = (description, result) => {
    setHistory((prev) => {
      const last = prev[0];
      if (last && last.description === description && last.result === result) {
        return prev;
      }
      return [{ description, result }, ...prev].slice(0, 10);
    });
  };

  const undo = () => {
    setHistory((prev) => {
      const [, ...rest] = prev;
      return rest;
    });
  };

  const ActiveComponent = plugins.find((p) => p.id === active)?.component;

  return (
    <div className="h-full w-full p-4 overflow-y-auto bg-panel text-white flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {plugins.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`px-3 py-1 rounded ${
              active === p.id ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>
      {ActiveComponent && <ActiveComponent onConvert={addHistory} />}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mt-4 mb-2">
            <h3 className="text-lg">History</h3>
            <button
              type="button"
              onClick={undo}
              className="px-2 py-1 bg-gray-600 rounded"
              data-testid="undo-btn"
            >
              Undo
            </button>
          </div>
          <ul className="space-y-1" data-testid="history-list">
            {history.map((h, i) => (
              <li key={i}>{h.description} = {h.result}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Converter;
export const displayConverter = () => <Converter />;
