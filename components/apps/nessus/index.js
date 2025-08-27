import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const NessusApp = () => <ToolSimulator toolName="nessus" sampleOutput={sample} />;

export default NessusApp;
export const displayNessus = () => <NessusApp />;
