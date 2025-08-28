import React, { useEffect, useState } from 'react';

const AppLoader = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey">
      <div className="w-2/3 space-y-4 animate-pulse">
        <div className="h-4 bg-ub-grey rounded" />
        <div className="h-4 bg-ub-grey rounded" />
        <div className="h-4 bg-ub-grey rounded" />
      </div>
    </div>
  );
};

export default AppLoader;
