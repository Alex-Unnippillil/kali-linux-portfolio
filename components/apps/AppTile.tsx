import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

export type AppTileVariant = 'grid' | 'detail';

export interface AppTileProps {
  id: string;
  title: string;
  icon?: string | null;
  href?: string;
  description?: string;
  offlineCapable?: boolean;
  variant?: AppTileVariant;
  className?: string;
  children?: ReactNode;
}

const OfflineBadge: FC<{ variant: AppTileVariant }> = ({ variant }) => (
  <span
    className={clsx(
      'inline-flex items-center rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm ring-1 ring-emerald-400/60 backdrop-blur',
      variant === 'grid' ? 'absolute right-2 top-2' : 'mb-3 self-start'
    )}
  >
    Offline Ready
  </span>
);

const renderIcon = (title: string, icon?: string | null, size = 64) => {
  if (!icon) {
    return (
      <span className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-200 text-lg font-semibold text-slate-700">
        {title.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={icon}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className="h-16 w-16"
    />
  );
};

const GridTile: FC<AppTileProps> = ({
  id,
  title,
  icon,
  href,
  offlineCapable,
  className,
}) => {
  const content = (
    <>
      {offlineCapable ? <OfflineBadge variant="grid" /> : null}
      {renderIcon(title, icon)}
      <span className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{title}</span>
    </>
  );

  const baseClass = clsx(
    'group relative flex flex-col items-center rounded-lg border border-slate-200/60 bg-white/80 p-4 text-center text-sm shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/20 dark:bg-slate-900/40',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={title} id={`app-tile-${id}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClass} role="link" tabIndex={0} aria-label={title} id={`app-tile-${id}`}>
      {content}
    </div>
  );
};

const DetailTile: FC<AppTileProps> = ({
  id,
  title,
  icon,
  href,
  description,
  offlineCapable,
  className,
  children,
}) => {
  return (
    <section
      aria-labelledby={`${id}-detail-title`}
      className={clsx(
        'relative flex flex-col gap-4 rounded-xl border border-slate-200/70 bg-white/90 p-6 text-left shadow-sm dark:border-white/15 dark:bg-slate-900/60',
        className
      )}
    >
      {offlineCapable ? <OfflineBadge variant="detail" /> : null}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {renderIcon(title, icon, 72)}
        </div>
        <div className="flex flex-col">
          <h3 id={`${id}-detail-title`} className="text-xl font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
          {href ? (
            <Link
              href={href}
              className="mt-2 inline-flex w-fit items-center rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Launch App
            </Link>
          ) : null}
        </div>
      </div>
      {description ? (
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-200">{description}</p>
      ) : null}
      {children}
    </section>
  );
};

const AppTile: FC<AppTileProps> = (props) => {
  const { variant = 'grid' } = props;
  if (variant === 'detail') {
    return <DetailTile {...props} />;
  }
  return <GridTile {...props} />;
};

export default AppTile;
