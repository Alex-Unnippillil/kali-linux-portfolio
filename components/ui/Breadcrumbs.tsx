import React from 'react';

import Button from './Button';

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
          <Button
            type="button"
            variant="link"
            className="px-0 py-0 text-white hover:text-ubt-grey"
            onClick={() => onNavigate(idx)}
          >
            {seg.name || '/'}
          </Button>
          {idx < path.length - 1 && <span>/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
