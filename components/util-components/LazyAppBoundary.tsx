import React, { Suspense } from 'react';

interface LazyAppBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

const LazyAppBoundary: React.FC<LazyAppBoundaryProps> = ({ fallback, children }) => {
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

export default LazyAppBoundary;
