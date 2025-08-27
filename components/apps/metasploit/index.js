import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const MetasploitApp = () => <ToolSimulator toolName="metasploit" sampleOutput={sample} />;

export default MetasploitApp;
export const displayMetasploit = () => <MetasploitApp />;
