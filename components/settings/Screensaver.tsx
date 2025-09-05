import { useState } from 'react';
import LockScreen from '../screen/lock_screen';

const Screensaver = () => {
  const [timeout, setTimeoutMinutes] = useState<number>(5);
  const [lockOnResume, setLockOnResume] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const handleLock = () => setIsLocked(true);
  const handleUnlock = () => setIsLocked(false);

  return (
    <div className="p-4">
      <div>
        <label htmlFor="screensaver-timeout" className="block mb-1">
          Timeout: {timeout} min
        </label>
        <input
          id="screensaver-timeout" aria-label="Screensaver timeout"
          type="range"
          min={1}
          max={60}
          value={timeout}
          onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
          className="w-full mb-4"
        />
        <div className="flex items-center gap-2 mb-4">
          <input
            id="lock-on-resume" aria-label="Lock on resume"
            type="checkbox"
            checked={lockOnResume}
            onChange={(e) => setLockOnResume(e.target.checked)}
          />
          <label htmlFor="lock-on-resume">Lock on resume</label>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-700 rounded" />
        ))}
      </div>
      <button
        onClick={handleLock}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Lock Now
      </button>
      <LockScreen isLocked={isLocked} unLockScreen={handleUnlock} />
    </div>
  );
};

export default Screensaver;

