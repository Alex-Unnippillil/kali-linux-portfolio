import React from 'react';
import clsx from 'clsx';
import styles from './Header.module.css';

type WindowHeaderProps = {
  title: string;
  grabbed?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  onBlur?: React.FocusEventHandler<HTMLDivElement>;
  className?: string;
};

const headerStyle: React.CSSProperties = {
  '--window-header-padding': 'calc(var(--space-2) * 2)',
  '--window-header-padding-sm': 'var(--space-2)',
  '--window-header-min-height': 'calc(var(--hit-area) + var(--space-2))',
};

const WindowHeader: React.FC<WindowHeaderProps> = ({
  title,
  grabbed = false,
  onKeyDown,
  onBlur,
  className,
}) => {
  return (
    <div
      className={clsx(styles.header, 'bg-ub-window-title', className)}
      tabIndex={0}
      role="button"
      aria-grabbed={grabbed}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      style={headerStyle}
    >
      <span className={styles.title} title={title}>
        {title}
      </span>
    </div>
  );
};

WindowHeader.displayName = 'WindowHeader';

export default WindowHeader;
