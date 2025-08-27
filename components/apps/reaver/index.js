import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const ReaverApp = () => <ToolSimulator toolName="reaver" sampleOutput={sample} />;

export default ReaverApp;
export const displayReaver = () => <ReaverApp />;
