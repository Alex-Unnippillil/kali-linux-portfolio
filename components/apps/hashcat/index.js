import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const HashcatApp = () => <ToolSimulator toolName="hashcat" sampleOutput={sample} />;

export default HashcatApp;
export const displayHashcat = () => <HashcatApp />;
