import React from 'react';

const WiresharkSkeleton = () => (
  <div className="flex flex-col space-y-2 p-4 animate-pulse text-white">
    <div className="h-4 bg-gray-700 rounded w-1/3" />
    <div className="h-3 bg-gray-700 rounded w-full" />
    <div className="h-3 bg-gray-700 rounded w-full" />
    <div className="h-3 bg-gray-700 rounded w-3/4" />
  </div>
);

export default WiresharkSkeleton;
