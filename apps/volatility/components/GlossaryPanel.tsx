import React from 'react';
import glossary from '../glossary';

interface GlossaryPanelProps {
  onClose: () => void;
}

const GlossaryPanel: React.FC<GlossaryPanelProps> = ({ onClose }) => {
  return (
    <aside className="w-64 p-3 border-l border-gray-700 bg-gray-900 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Plugin Glossary</h3>
        <button onClick={onClose} className="text-xs text-red-400">
          Close
        </button>
      </div>
      <ul className="space-y-2">
        {Object.entries(glossary).map(([key, entry]) => (
          <li key={key}>
            <h4 className="text-xs font-semibold">{entry.title}</h4>
            <p className="text-xs mb-1">{entry.description}</p>
            <a
              href={entry.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline"
            >
              External docs
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default GlossaryPanel;
