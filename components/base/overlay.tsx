import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './window.module.css';

export type SnapPreviewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

interface SnapOverlayProps {
  preview: SnapPreviewRect;
  label: string;
}

const SnapOverlay: React.FC<SnapOverlayProps> = React.memo(({ preview, label }) => {
  const style = useMemo(() => ({
    left: `${preview.left}px`,
    top: `${preview.top}px`,
    width: `${preview.width}px`,
    height: `${preview.height}px`,
  }), [preview.height, preview.left, preview.top, preview.width]);

  return (
    <div
      data-testid="snap-preview"
      className={clsx(
        'fixed pointer-events-none z-40 transition-opacity will-change-transform',
        styles.snapPreview,
        styles.snapPreviewGlass,
      )}
      style={style}
      aria-live="polite"
      aria-label={label}
      role="status"
    >
      <span className={styles.snapPreviewLabel} aria-hidden="true">
        {label}
      </span>
    </div>
  );
});

SnapOverlay.displayName = 'SnapOverlay';

export default SnapOverlay;
