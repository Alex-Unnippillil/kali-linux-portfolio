import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const ReconngApp = () => <ToolSimulator toolName="reconng" sampleOutput={sample} />;

export default ReconngApp;
export const displayReconng = () => <ReconngApp />;
