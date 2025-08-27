import React from 'react';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="flex border-b border-gray-700 mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3 py-1 text-sm focus:outline-none ${
            t.id === active ? 'border-b-2 border-white' : ''
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
