'use client';

import Link from 'next/link';
import { DEVTOOLS_LINKS } from './tools';

const baseClasses =
  'inline-flex flex-col rounded-md border border-white/10 bg-ub-cool-grey/70 px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange hover:bg-ub-cool-grey/90';

export default function DiagnosticLinks() {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ubt-ice-white/70">
        Quick diagnostics
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Diagnostics and log viewers">
        {DEVTOOLS_LINKS.map((tool) => {
          const content = (
            <>
              <span className="text-sm font-medium text-white">{tool.label}</span>
              <span className="text-xs text-ubt-ice-white/80">{tool.description}</span>
            </>
          );

          return (
            <li key={tool.id} className="min-w-[14rem] max-w-xs">
              {tool.external ? (
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noreferrer"
                  className={baseClasses}
                >
                  {content}
                </a>
              ) : (
                <Link href={tool.href} className={baseClasses}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
