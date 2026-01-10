import React from 'react';

const baseClassName = 'text-sm text-white';

/**
 * Builds a polite or assertive live region loader that keeps announcements
 * focused on meaningful changes. Components using this helper should pass a
 * stable message string so screen readers only announce when the text changes.
 *
 * @param {string} message - Human readable status message that will be
 * announced.
 * @param {{ tone?: 'polite' | 'assertive'; className?: string; role?: string }} [options]
 * tone - Controls the aria-live politeness level.
 * className - Additional classes merged with the base styles.
 * role - Override the default status/alert role mapping.
 * @returns {React.FC}
 */
export function createLiveRegionLoader(message, options = {}) {
  const { tone = 'polite', className = '', role } = options;
  const resolvedRole = role || (tone === 'assertive' ? 'alert' : 'status');
  const combinedClassName = [baseClassName, className].filter(Boolean).join(' ');

  const Loader = () => (
    <div
      role={resolvedRole}
      aria-live={tone}
      aria-atomic="true"
      className={combinedClassName}
      data-testid="async-loader"
    >
      {message}
    </div>
  );

  Loader.displayName = `LiveRegionLoader(${resolvedRole})`;
  return Loader;
}
