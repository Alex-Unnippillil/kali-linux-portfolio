import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import type { AppMetadata } from '../../../lib/appRegistry';

interface ShellApp {
  id: string;
  title: string;
  icon?: string | null;
  meta: AppMetadata;
}

export interface AppCatalogShellProps {
  generatedAt: string;
  apps: ShellApp[];
}

export const AppCatalogShell: React.FC<AppCatalogShellProps> = ({
  generatedAt,
  apps,
}) => (
  <div className="p-4" data-hydrated="false">
    <div className="mb-2 text-xs text-slate-500">
      Static snapshot generated {new Date(generatedAt).toLocaleString()}
    </div>
    <div className="mb-4 h-10 w-full animate-pulse rounded bg-slate-800" aria-hidden="true" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {apps.map(({ id, title, icon, meta }) => (
        <article
          key={id}
          className="flex flex-col items-center rounded border border-slate-700 bg-slate-900 p-4 text-center text-white"
        >
          {icon ? (
            <Image src={icon} alt="" width={64} height={64} sizes="64px" className="h-16 w-16" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded bg-slate-800 text-xl">
              {title.charAt(0)}
            </span>
          )}
          <span className="mt-2 text-sm font-medium">{title}</span>
          <p className="mt-1 text-xs text-slate-400 line-clamp-3">{meta.description}</p>
          <Link href={meta.path} className="mt-3 text-xs text-sky-400" aria-disabled="true">
            Launch after hydration
          </Link>
        </article>
      ))}
    </div>
  </div>
);

export default AppCatalogShell;
