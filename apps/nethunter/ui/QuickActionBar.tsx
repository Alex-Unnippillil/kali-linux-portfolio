import React from 'react';
import styles from './QuickActionBar.module.css';
import type { TileTone } from './Tile';

type Orientation = 'portrait' | 'landscape';

export interface QuickToggle {
  id: string;
  label: string;
  detail: string;
  active: boolean;
  tone?: TileTone;
}

interface QuickActionBarProps {
  toggles: QuickToggle[];
  onToggle: (id: string) => void;
  orientation: Orientation;
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({ toggles, onToggle, orientation }) => {
  return (
    <div
      className={`${styles.bar} ${
        orientation === 'portrait' ? styles.barPortrait : styles.barLandscape
      }`}
      role="group"
      aria-label="Quick controls"
    >
      {toggles.map((toggle) => (
        <button
          key={toggle.id}
          type="button"
          className={`${styles.toggle} ${toggle.active ? styles.toggleActive : ''}`}
          onClick={() => onToggle(toggle.id)}
          aria-pressed={toggle.active}
        >
          <div className={styles.toggleText}>
            <span className={styles.toggleLabel}>{toggle.label}</span>
            <span className={styles.toggleDetail}>{toggle.detail}</span>
          </div>
          <span className={styles.statePill}>{toggle.active ? 'On' : 'Off'}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActionBar;
