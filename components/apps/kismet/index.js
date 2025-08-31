import React, { useState } from 'react';
import sampleCapture from './sampleCapture.json';

const KismetApp = () => {
  const [frames, setFrames] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState([]);

  const loadSample = () => {
    setFrames(sampleCapture);
    setIndex(0);
    setVisible([]);
  };

  const step = () => {
    if (!frames.length || index >= frames.length) return;
    setVisible((prev) => [...prev, frames[index]]);
    setIndex(index + 1);
  };

  return (
    <div className="p-4 text-white">
      <button onClick={loadSample}>Load Sample</button>
      <button onClick={step}>Step</button>
      <ul>
        {visible.map((n, i) => (
          <li key={i}>{n.ssid}</li>
        ))}
      </ul>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

