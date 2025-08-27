import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const AutopsyApp = () => <ToolSimulator toolName="autopsy" sampleOutput={sample} />;

export default AutopsyApp;
export const displayAutopsy = () => <AutopsyApp />;
