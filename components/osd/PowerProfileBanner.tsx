import React from 'react';

interface Props {
  source: 'ac' | 'battery';
}

const PowerProfileBanner: React.FC<Props> = ({ source }) => {
  const message = source === 'ac' ? 'Running on AC power' : 'Running on battery power';
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-ub-cool-grey text-white text-center py-2">
      {message}
    </div>
  );
};

export default PowerProfileBanner;
