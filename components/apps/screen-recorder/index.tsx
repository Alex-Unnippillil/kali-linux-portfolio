import React from 'react';

import RecorderPanel from './RecorderPanel';

const ScreenRecorder: React.FC = () => {
  return <RecorderPanel />;
};

export default ScreenRecorder;

export const displayScreenRecorder = () => {
  return <ScreenRecorder />;
};
