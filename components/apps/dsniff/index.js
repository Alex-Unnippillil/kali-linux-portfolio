import React, { useEffect, useState } from 'react';

const Dsniff = () => {
  const [urlsnarfOutput, setUrlsnarfOutput] = useState('');
  const [arpspoofOutput, setArpspoofOutput] = useState('');

  useEffect(() => {
    const fetchOutputs = async () => {
      try {
        const [urlsnarfRes, arpspoofRes] = await Promise.all([
          fetch('/api/dsniff/urlsnarf').then((r) => r.text()).catch(() => ''),
          fetch('/api/dsniff/arpspoof').then((r) => r.text()).catch(() => ''),
        ]);
        if (urlsnarfRes) setUrlsnarfOutput(urlsnarfRes);
        if (arpspoofRes) setArpspoofOutput(arpspoofRes);
      } catch (e) {
        // ignore errors
      }
    };
    fetchOutputs();
    const interval = setInterval(fetchOutputs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-2 overflow-auto">
      <h1 className="text-lg mb-2">dsniff</h1>
      <div className="mb-4">
        <h2 className="font-bold">urlsnarf</h2>
        <pre className="bg-black text-green-500 p-2 h-40 overflow-auto whitespace-pre-wrap">
          {urlsnarfOutput || 'No data'}
        </pre>
      </div>
      <div>
        <h2 className="font-bold">arpspoof</h2>
        <pre className="bg-black text-green-500 p-2 h-40 overflow-auto whitespace-pre-wrap">
          {arpspoofOutput || 'No data'}
        </pre>
      </div>
    </div>
  );
};

export default Dsniff;

export const displayDsniff = (addFolder, openApp) => (
  <Dsniff addFolder={addFolder} openApp={openApp} />
);
