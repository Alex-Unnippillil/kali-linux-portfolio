import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const HydraApp = () => <ToolSimulator toolName="hydra" sampleOutput={sample} />;

export default HydraApp;
export const displayHydra = () => <HydraApp />;
