import React, { useState } from 'react';

const KismetApp = () => {
  const [loaded, setLoaded] = useState(false);
  const [stepped, setStepped] = useState(false);

  const loadSample = () => {
    setLoaded(true);
  };

  const step = () => {
    if (loaded) setStepped(true);
  };

  return (
    <div className="p-4 text-white">
      <button onClick={loadSample}>Load Sample</button>
      <button onClick={step}>Step</button>
      {stepped && <div>CoffeeShopWiFi</div>}
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

