import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const BeefApp = () => <ToolSimulator toolName="beef" sampleOutput={sample} />;

export default BeefApp;
export const displayBeef = () => <BeefApp />;
