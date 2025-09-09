'use client';

import ToggleSwitch from '@/components/ToggleSwitch';
import { useSettings } from '@/hooks/useSettings';

export default function IconsSettings() {
  const { highContrast, setHighContrast } = useSettings();
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Icons</h1>
      <div className="flex items-center gap-2">
        <span>High contrast icons</span>
        <ToggleSwitch
          checked={highContrast}
          onChange={setHighContrast}
          ariaLabel="Toggle high contrast icons"
        />
      </div>
    </div>
  );
}

