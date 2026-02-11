import { useEffect, useState } from 'react';

export const useAnnouncements = (message: string) => {
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (!message) return;
    setAnnouncement(message);
  }, [message]);
  return announcement;
};
