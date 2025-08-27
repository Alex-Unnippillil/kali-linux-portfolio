import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const MimikatzApp = () => <ToolSimulator toolName="mimikatz" sampleOutput={sample} />;

export default MimikatzApp;
export const displayMimikatz = () => <MimikatzApp />;
