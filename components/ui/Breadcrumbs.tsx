import React from 'react';
import { useDesktop } from '../core/DesktopProvider';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const { tokens } = useDesktop();

  return (
    <nav
      className={`flex items-center text-white ${tokens.inlineGap} ${tokens.text}`.trim()}
      aria-label="Breadcrumb"
    >
      {path.map((seg, idx) => (
        <React.Fragment key={idx}>
          <button
            type="button"
            onClick={() => onNavigate(idx)}
            className="hover:underline focus:outline-none"
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
