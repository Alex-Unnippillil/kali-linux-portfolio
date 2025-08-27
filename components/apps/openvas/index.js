import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const OpenvasApp = () => <ToolSimulator toolName="openvas" sampleOutput={sample} />;

export default OpenvasApp;
export const displayOpenvas = () => <OpenvasApp />;
