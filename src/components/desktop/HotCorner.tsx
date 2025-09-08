import React, { useCallback, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const HINT_KEY = 'hot-corner-hint';

/**
 * HotCorner component renders an interactive area in the top-left corner of the screen.
 * Displays a subtle indicator on first use and triggers an overview overlay when activated.
 * Respects reduced-motion preferences and allows users to disable hints.
 */
const HotCorner: React.FC = () => {
  const [showHint, setShowHint] = usePersistentState<boolean>(HINT_KEY, true, (v): v is boolean => typeof v === 'boolean');
  const [active, setActive] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const activate = useCallback(() => {
    setActive(true);
    if (showHint) setShowHint(false);
  }, [showHint, setShowHint]);

  const deactivate = useCallback(() => setActive(false), []);

  return (
    <>
      <div
        className="absolute top-0 left-0 w-4 h-4 z-50"
        onMouseEnter={activate}
        onFocus={activate}
        onMouseLeave={deactivate}
        onBlur={deactivate}
        tabIndex={0}
      >
        {showHint && (
          <button
            type="button"
            className={`w-full h-full rounded-full bg-[var(--color-accent)] opacity-75 ${prefersReducedMotion ? '' : 'animate-pulse'}`}
            onClick={() => setShowHint(false)}
            aria-label="Dismiss hot corner hint"
          />
        )}
      </div>
      <div
        className={`pointer-events-none absolute inset-0 bg-black/50 ${prefersReducedMotion ? '' : 'transition-opacity duration-300'} ${active ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />
    </>
  );
};

export default HotCorner;

