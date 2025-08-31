import React, { useState } from 'react';
import sampleCapture from './sampleCapture.json';

const KismetApp = () => {
  const [frames, setFrames] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [nets, setNets] = useState([]);

  const loadSample = () => {
    setFrames(sampleCapture);
    setCursor(0);
    setNets([]);
  };

  const step = () => {
    if (cursor < frames.length) {
      const frame = frames[cursor];
      setCursor(cursor + 1);
      if (frame.ssid) setNets((n) => [...n, frame.ssid]);
    }
  };

  return (
    <div className="p-4 text-white space-y-2">
      <div className="space-x-2">
        <button onClick={loadSample}>Load Sample</button>
        <button onClick={step}>Step</button>
      </div>
      <ul>
        {nets.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

