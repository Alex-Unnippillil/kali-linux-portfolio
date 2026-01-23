import React from 'react';
import EttercapConsole from '../../../modules/ettercap/EttercapConsole';

const EttercapApp = () => (
  <div className="h-full w-full overflow-hidden">
    <EttercapConsole variant="desktop" />
  </div>
);

export default EttercapApp;

export const displayEttercap = () => <EttercapApp />;
