import React from 'react';
import styles from './Tile.module.css';

export type TileTone = 'default' | 'primary' | 'alert';

export interface TileAction {
  id: string;
  label: string;
  detail?: string;
  tone?: TileTone;
  onSelect?: (id: string) => void;
}

export interface TileProps {
  icon: string;
  title: string;
  description: string;
  actions: TileAction[];
  onAction?: (actionId: string) => void;
}

const Tile: React.FC<TileProps> = ({ icon, title, description, actions, onAction }) => {
  const handleClick = (action: TileAction) => {
    action.onSelect?.(action.id);
    onAction?.(action.id);
  };

  return (
    <article className={styles.tile} aria-label={title}>
      <header className={styles.header}>
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
        <div>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
      </header>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`${styles.actionButton} ${
              action.tone === 'primary'
                ? styles.primary
                : action.tone === 'alert'
                ? styles.alert
                : ''
            }`}
            onClick={() => handleClick(action)}
          >
            <span>{action.label}</span>
            {action.detail && <span className={styles.actionMeta}>{action.detail}</span>}
          </button>
        ))}
      </div>
    </article>
  );
};

export default Tile;
