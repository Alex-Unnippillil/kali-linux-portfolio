import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const EttercapApp = () => <ToolSimulator toolName="ettercap" sampleOutput={sample} />;

export default EttercapApp;
export const displayEttercap = () => <EttercapApp />;
