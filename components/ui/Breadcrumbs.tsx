import React from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  return (
    <nav className="flex items-center space-x-1 text-white" aria-label="Breadcrumb">
      {path.map((seg, idx) => (
        <React.Fragment key={idx}>
          <button
            type="button"
            onClick={() => onNavigate(idx)}
            className="rounded-md px-2 py-1 text-sm font-medium text-white/90 transition-colors hover:bg-interactive-hover hover:text-white focus-visible:bg-interactive-hover focus-visible:text-white active:bg-interactive-active"
          >
            {seg.name || '/'}
          </button>
          {idx < path.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
