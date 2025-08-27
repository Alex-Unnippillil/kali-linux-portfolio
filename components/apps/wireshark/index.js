import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const WiresharkApp = () => <ToolSimulator toolName="wireshark" sampleOutput={sample} />;

export default WiresharkApp;
export const displayWireshark = () => <WiresharkApp />;
