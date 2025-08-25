import React from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const Platformer = () => (
  <iframe
    src="/apps/platformer/index.html"
    title="Platformer"
    className="w-full h-full"
    frameBorder="0"
  ></iframe>
);

const PlatformerWithBoundary = withGameErrorBoundary(Platformer);

export default PlatformerWithBoundary;
