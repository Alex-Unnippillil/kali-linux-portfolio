import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const NmapNseApp = () => <ToolSimulator toolName="nmap-nse" sampleOutput={sample} />;

export default NmapNseApp;
export const displayNmapNse = () => <NmapNseApp />;
