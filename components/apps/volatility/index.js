import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const VolatilityApp = () => <ToolSimulator toolName="volatility" sampleOutput={sample} />;

export default VolatilityApp;
export const displayVolatility = () => <VolatilityApp />;
