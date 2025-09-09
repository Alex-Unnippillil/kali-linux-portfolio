import React, { useState, useEffect } from 'react';
import keybindingManager from './keybindingManager';

export interface WindowInfo {
  id: string;
  title: string;
  icon: string;
  preview?: string;
}

interface Props {
  windows: WindowInfo[];
  onSelect?: (id: string) => void;
}

export default function WindowSwitcher({ windows, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [cycleAll, setCycleAll] = useState(false);

  useEffect(() => {
    const handleAltTab = () => {
      setVisible(true);
      setIndex((i) => (i + 1) % windows.length);
    };

    keybindingManager.register('Alt+Tab', handleAltTab);

    const handleKeyUp = (e: KeyboardEvent) => {
        if (visible && e.key === 'Alt') {
          setVisible(false);
          const id = windows[index]?.id;
          if (id) onSelect?.(id);
          setIndex(0);
        }
    };

    window.addEventListener('keyup', handleKeyUp);

    return () => {
      keybindingManager.unregister('Alt+Tab', handleAltTab);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [visible, windows, index, onSelect]);

  if (!visible) return null;

  return (
    <div
      className="window-switcher-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="window-switcher-list"
        style={{ display: 'flex', gap: '1rem' }}
      >
        {windows.map((win, i) => (
          <div
            key={win.id}
            className={
              i === index ? 'window-switcher-item active' : 'window-switcher-item'
            }
            style={{
              padding: '0.5rem',
              border: i === index ? '2px solid #fff' : '2px solid transparent',
              background: '#222',
              color: '#fff',
              width: '200px',
              textAlign: 'center',
            }}
          >
            <img src={win.icon} alt="" style={{ width: '32px', height: '32px' }} />
            <div>{win.title}</div>
            {win.preview && (
              <img
                src={win.preview}
                alt="preview"
                style={{ width: '100%', marginTop: '0.5rem' }}
              />
            )}
          </div>
        ))}
      </div>
      <label
        className="cycle-all"
        style={{ marginTop: '1rem', color: '#fff' }}
      >
        <input
          type="checkbox"
          aria-label="Cycle through all workspaces"
          checked={cycleAll}
          onChange={() => setCycleAll((v) => !v)}
        />{' '}
        Cycle through all workspaces
      </label>
    </div>
  );
}
