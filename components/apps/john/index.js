import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const JohnApp = () => <ToolSimulator toolName="john" sampleOutput={sample} />;

export default JohnApp;
export const displayJohn = () => <JohnApp />;
