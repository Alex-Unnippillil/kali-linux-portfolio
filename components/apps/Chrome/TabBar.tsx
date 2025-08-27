import React from 'react';

export interface Tab {
  url: string;
  title?: string;
  favicon?: string;
}

interface Props {
  tabs: Tab[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: (index: number) => void;
  onAdd: () => void;
}

const TabBar: React.FC<Props> = ({ tabs, activeIndex, onSelect, onClose, onAdd }) => {
  return (
    <div className="flex bg-ub-window-title text-white text-xs select-none">
      {tabs.map((tab, idx) => (
        <div
          key={idx}
          className={`flex items-center px-2 py-1 cursor-pointer border-r border-gray-700 max-w-[10rem] ${idx === activeIndex ? 'bg-gray-800' : 'bg-gray-700'}`}
          onClick={() => onSelect(idx)}
        >
          {tab.favicon && (
            <img src={tab.favicon} alt="" className="w-3 h-3 mr-1" />
          )}
          <span className="truncate flex-1">{tab.title || tab.url}</span>
          {tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(idx);
              }}
              className="ml-1 text-white hover:text-red-400"
              aria-label={`Close tab ${idx + 1}`}
            >
              ×
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="px-2 py-1 hover:bg-gray-600"
        aria-label="New tab"
      >
        +
      </button>
    </div>
  );
};

export default TabBar;
