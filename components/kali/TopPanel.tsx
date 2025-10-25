import React from 'react';
import styles from './top-panel.module.css';

const TopPanel: React.FC = () => {
  return (
    <div className={styles.panel}>
      <div className={styles.left}>
        <button className={styles.start}>Start</button>
      </div>
      <div className={styles.right}>
        {/* Right side content */}
      </div>
    </div>
  );
};

export default TopPanel;
