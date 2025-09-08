'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { getWorkspace, setWorkspace } from '../../lib/workspace-store';

const WORKSPACES = 4;

export default function WorkspaceSwitcher() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setActive(getWorkspace());
  }, []);

  useEffect(() => {
    setWorkspace(active);
  }, [active]);

  const activate = (idx: number) => {
    setActive(idx);
    refs.current[idx]?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next = idx;
    switch (e.key) {
      case 'ArrowRight':
        next = (idx + 1) % WORKSPACES;
        break;
      case 'ArrowLeft':
        next = (idx + WORKSPACES - 1) % WORKSPACES;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = WORKSPACES - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    activate(next);
  };

  return (
    <div role="tablist" aria-label="Workspaces" className="flex space-x-1">
      {Array.from({ length: WORKSPACES }, (_, i) => (
        <button
          key={i}
          role="tab"
          aria-label={`Workspace ${i + 1}`}
          aria-selected={i === active}
          tabIndex={i === active ? 0 : -1}
          ref={(el) => (refs.current[i] = el)}
          onClick={() => activate(i)}
          onKeyDown={(e) => handleKey(e, i)}
          className={`w-2 h-2 rounded-full ${
            i === active ? 'bg-ubt-blue' : 'bg-ubt-grey'
          }`}
        />
      ))}
    </div>
  );
}
