import React from 'react';

interface DemoBannerProps {
  children?: React.ReactNode;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ children = 'Demo mode: form disabled' }) => (
  <div
    role="status"
    className="mb-2 rounded bg-yellow-200 p-2 text-sm text-yellow-800"
  >
    {children}
  </div>
);

export default DemoBanner;
