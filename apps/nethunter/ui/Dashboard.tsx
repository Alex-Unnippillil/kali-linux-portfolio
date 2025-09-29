import React from 'react';
import Tile, { TileAction } from './Tile';
import styles from './Dashboard.module.css';

type Orientation = 'portrait' | 'landscape';

export interface DashboardTile {
  id: string;
  icon: string;
  title: string;
  description: string;
  actions: TileAction[];
}

interface DashboardProps {
  primaryTiles: DashboardTile[];
  secondaryTiles: DashboardTile[];
  orientation: Orientation;
  onAction?: (tileId: string, actionId: string) => void;
  statusMessage?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  primaryTiles,
  secondaryTiles,
  orientation,
  statusMessage,
  onAction,
}) => {
  const dashboardClass = `${styles.dashboard} ${
    orientation === 'portrait' ? styles.dashboardPortrait : styles.dashboardLandscape
  }`;

  const secondaryClass = `${styles.secondaryRow} ${
    orientation === 'portrait' ? styles.secondaryPortrait : styles.secondaryLandscape
  }`;

  return (
    <section className={dashboardClass}>
      <div className={styles.statusBanner} role="status" aria-live="polite">
        <span className={styles.statusAccent} aria-hidden="true">
          🚗
        </span>
        <div className={styles.statusText}>
          <strong>Car mode optimized</strong>
          <span>{statusMessage ?? 'Large controls and adaptive layout ready for the road.'}</span>
        </div>
      </div>
      {primaryTiles.map((tile) => (
        <Tile
          key={tile.id}
          {...tile}
          onAction={(actionId) => onAction?.(tile.id, actionId)}
        />
      ))}
      <div className={secondaryClass}>
        {secondaryTiles.map((tile) => (
          <Tile
            key={tile.id}
            {...tile}
            onAction={(actionId) => onAction?.(tile.id, actionId)}
          />
        ))}
      </div>
    </section>
  );
};

export default Dashboard;
