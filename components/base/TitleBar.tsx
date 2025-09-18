import { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './TitleBar.module.css';

export type TitleBarProps = {
  /** Optional icon rendered before the title */
  icon?: ReactNode;
  /** Primary title content, announced as a heading. */
  title: ReactNode;
  /** Optional secondary text displayed under the title. */
  subtitle?: ReactNode;
  /** Optional action area rendered on the right side. */
  actions?: ReactNode;
  /** Alias for actions to support JSX children usage. */
  children?: ReactNode;
  /** Custom CSS class name appended to the root element. */
  className?: string;
  /** Heading level used for accessibility announcements. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
};

const TitleBar = ({
  icon,
  title,
  subtitle,
  actions,
  children,
  className,
  headingLevel = 2,
}: TitleBarProps) => {
  const controls = actions ?? children;

  return (
    <header className={clsx(styles.root, className)}>
      <div className={styles.leading}>
        {icon ? <div className={styles.icon}>{icon}</div> : null}
        <div className={styles.text}>
          <span role="heading" aria-level={headingLevel} className={styles.title}>
            {title}
          </span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </div>
      </div>
      {controls ? <div className={styles.controls}>{controls}</div> : null}
    </header>
  );
};

export default TitleBar;
