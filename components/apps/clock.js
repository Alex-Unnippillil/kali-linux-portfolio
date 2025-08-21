import React, { useEffect, useState } from 'react';

export default function ClockApp() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white select-none">
      <div className="text-6xl font-bold" data-testid="clock-time">{time.toLocaleTimeString()}</div>
      <div className="text-xl mt-2" data-testid="clock-date">{time.toLocaleDateString()}</div>
    </div>
  );
}

export const displayClock = (addFolder, openApp) => {
  return <ClockApp addFolder={addFolder} openApp={openApp} />;
};
