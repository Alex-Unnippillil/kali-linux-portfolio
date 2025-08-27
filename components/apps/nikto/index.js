import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const NiktoApp = () => <ToolSimulator toolName="nikto" sampleOutput={sample} />;

export default NiktoApp;
export const displayNikto = () => <NiktoApp />;
