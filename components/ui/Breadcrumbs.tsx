import React from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = React.useState(() => Math.max(path.length - 1, 0));

  React.useEffect(() => {
    buttonRefs.current = buttonRefs.current.slice(0, path.length);
    setFocusedIndex(Math.max(path.length - 1, 0));
  }, [path.length]);

  const focusButton = React.useCallback((index: number) => {
    const button = buttonRefs.current[index];
    if (button) {
      button.focus();
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      setFocusedIndex(prevIndex);
      focusButton(prevIndex);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, path.length - 1);
      setFocusedIndex(nextIndex);
      focusButton(nextIndex);
    }
  };

  return (
    <nav className="flex items-center space-x-1 text-white" aria-label="Breadcrumb">
      {path.map((seg, idx) => (
        <React.Fragment key={idx}>
          <button
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            onClick={() => onNavigate(idx)}
            onFocus={() => setFocusedIndex(idx)}
            onKeyDown={(event) => handleKeyDown(event, idx)}
            tabIndex={focusedIndex === idx ? 0 : -1}
            aria-current={idx === path.length - 1 ? 'page' : undefined}
            className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 hover:underline"
          >
            {seg.name || '/'}
          </button>
          {idx < path.length - 1 && <span aria-hidden="true">/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
