import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const KismetApp = () => <ToolSimulator toolName="kismet" sampleOutput={sample} />;

export default KismetApp;
export const displayKismet = () => <KismetApp />;
