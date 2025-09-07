import React from 'react';

/**
 * SafetyNote displays an ethics reminder for security testing.
 * It links to external resources covering best practices.
 */
export default function SafetyNote() {
  return (
    <aside
      role="note"
      aria-labelledby="safety-note-heading"
      className="prose prose-invert prose-sm mt-8 w-5/6 md:w-3/4 text-center border border-yellow-500 rounded p-3 bg-ub-cool-grey"
    >
      <h2 id="safety-note-heading">Safety Notice</h2>
      <p>
        Use security tools responsibly and only on systems you are authorized to
        test. Learn more about{' '}
        <a
          href="https://owasp.org/www-project-web-security-testing-guide/stable/en/01-Introduction/0A-Testing-Ethics"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ubt-blue"
        >
          testing ethics
        </a>
        .
      </p>
    </aside>
  );
}
