import React from 'react';
import { computeRelAttribute, LINK_UNAVAILABLE_COPY, sanitizeUrl } from '../../../utils/urlPolicy';

/**
 * SafetyNote displays an ethics reminder for security testing.
 * It links to external resources covering best practices.
 */
export default function SafetyNote() {
  return (
    <aside
      role="note"
      aria-labelledby="safety-note-heading"
      className="mt-8 w-5/6 md:w-3/4 text-xs md:text-sm text-center border border-yellow-500 rounded p-3 bg-ub-cool-grey"
    >
      <h2 id="safety-note-heading" className="text-sm md:text-base font-bold mb-1">
        Safety Notice
      </h2>
      <p>
        Use security tools responsibly and only on systems you are authorized to
        test. Learn more about{' '}
        {(() => {
          const safeLink = sanitizeUrl(
            'https://owasp.org/www-project-web-security-testing-guide/stable/en/01-Introduction/0A-Testing-Ethics',
          );
          if (!safeLink) {
            return (
              <span className="underline italic text-ubt-grey">
                testing ethics ({LINK_UNAVAILABLE_COPY})
              </span>
            );
          }
          return (
            <a
              href={safeLink.href}
              target="_blank"
              rel={computeRelAttribute(safeLink.isExternal)}
              className="underline text-ubt-blue"
            >
              testing ethics
            </a>
          );
        })()}
        .
      </p>
    </aside>
  );
}
