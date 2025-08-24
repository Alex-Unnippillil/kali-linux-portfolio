import React, { useState } from 'react';
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

  const addHistory = (description, result) => {
    setHistory((prev) => [{ description, result }, ...prev].slice(0, 10));
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
          <h3 className="text-lg mt-4 mb-2">History</h3>
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
