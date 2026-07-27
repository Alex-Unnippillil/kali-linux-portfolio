"use client";

import { useEffect, useState } from 'react';

const PanelClock: React.FC = () => {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{time.toLocaleTimeString()}</span>;
};

export default PanelClock;
