import React from 'react';
import { useSettings } from '../../hooks/useSettings';

const QuickSettings = () => {
  const { reducedMotion, setReducedMotion } = useSettings();

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="reduced-motion-toggle" className="flex items-center space-x-2">
        <input
          id="reduced-motion-toggle"
          type="checkbox"
          checked={reducedMotion}
          onChange={(e) => setReducedMotion(e.target.checked)}
        />
        <span>Disable animations</span>
      </label>
    </div>
  );
};

export default QuickSettings;

