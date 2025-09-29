import React, { useEffect, useRef, useState } from 'react';

interface Segment {
  name: string;
  [key: string]: unknown;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
  onRename?: (nextName: string) => void | Promise<void>;
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      const current = path[path.length - 1];
      setDraftName(current?.name ?? '');
    }
  }, [path, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEditing = (initial: string) => {
    if (!onRename) return;
    if (path.length <= 1) return;
    setDraftName(initial);
    setEditing(true);
  };

  const cancelEditing = () => {
    const current = path[path.length - 1];
    setDraftName(current?.name ?? '');
    setEditing(false);
  };

  const commitEditing = async () => {
    if (!onRename) {
      cancelEditing();
      return;
    }
    const current = path[path.length - 1];
    const trimmed = draftName.trim();
    setEditing(false);
    if (!trimmed || !current || trimmed === current.name) {
      setDraftName(current?.name ?? '');
      return;
    }
    await onRename(trimmed);
  };

  return (
    <nav className="flex items-center space-x-1 text-white" aria-label="Breadcrumb">
      {path.map((seg, idx) => {
        const isLast = idx === path.length - 1;
        return (
          <React.Fragment key={idx}>
            {isLast && editing ? (
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={() => {
                  void commitEditing();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void commitEditing();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelEditing();
                  }
                }}
                className="bg-black bg-opacity-40 rounded px-1 py-0.5 focus:outline-none"
                aria-label="Rename folder"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!isLast) onNavigate(idx);
                }}
                onDoubleClick={() => {
                  if (isLast) startEditing(seg.name || '/');
                }}
                className={`hover:underline focus:outline-none ${isLast ? 'font-semibold' : ''}`}
                title={isLast && onRename ? 'Double-click to rename' : undefined}
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
