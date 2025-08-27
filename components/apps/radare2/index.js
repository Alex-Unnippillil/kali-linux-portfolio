import React from 'react';
import ToolSimulator from '../tool-simulator';
import sample from './sample-output.json';

const Radare2App = () => <ToolSimulator toolName="radare2" sampleOutput={sample} />;

export default Radare2App;
export const displayRadare2 = () => <Radare2App />;
