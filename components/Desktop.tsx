import React, { useState, useEffect } from 'react';
import DesktopBase from './screen/desktop';

interface DesktopProps {
  [key: string]: any;
}

const Desktop: React.FC<DesktopProps> = (props) => {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const handleToggle = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setShowOverlay((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleToggle);
    return () => window.removeEventListener('keydown', handleToggle);
  }, []);

  return (
    <div className="relative w-full h-full">
      <DesktopBase {...props} />
      {showOverlay && (
        <div
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      )}
    </div>
  );
};

export default Desktop;
