import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const GhidraApp = () => <ToolSimulator toolName="ghidra" sampleOutput={sample} />;

export default GhidraApp;
export const displayGhidra = () => <GhidraApp />;
