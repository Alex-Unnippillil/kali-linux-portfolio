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
      {path.map((seg, idx) => {
        const isCurrent = idx === path.length - 1;
        return (
          <React.Fragment key={idx}>
            {isCurrent ? (
              <span aria-current="page">{seg.name || '/'}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(idx)}
                className="hover:underline"
              >
                {seg.name || '/'}
              </button>
            )}
            {idx < path.length - 1 && <span>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
