import { useState } from 'react';
import ToggleSwitch from '../../../components/ToggleSwitch';

export default function MouseSettings() {
  const [accel, setAccel] = useState(false);
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Mouse</h1>
      <div className="flex items-center gap-2">
        <span>Enable acceleration</span>
        <ToggleSwitch
          checked={accel}
          onChange={setAccel}
          ariaLabel="Toggle mouse acceleration"
        />
      </div>
    </div>
  );
}
