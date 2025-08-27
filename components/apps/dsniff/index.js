import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const DsniffApp = () => <ToolSimulator toolName="dsniff" sampleOutput={sample} />;

export default DsniffApp;
export const displayDsniff = () => <DsniffApp />;
