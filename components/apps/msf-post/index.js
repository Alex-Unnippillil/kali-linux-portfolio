import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const MsfPostApp = () => <ToolSimulator toolName="msf-post" sampleOutput={sample} />;

export default MsfPostApp;
export const displayMsfPost = () => <MsfPostApp />;
