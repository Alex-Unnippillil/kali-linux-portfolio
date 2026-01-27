import React from 'react';

const Tabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Radare2 sections">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tab-panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isActive ? 'font-semibold' : ''
            }`}
            style={{
              backgroundColor: 'var(--r2-surface)',
              border: '1px solid var(--r2-border)',
              color: 'var(--r2-text)',
              boxShadow: isActive
                ? '0 0 0 2px color-mix(in srgb, var(--r2-accent) 35%, transparent)'
                : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
