import React from 'react';

const KismetApp = ({ onNetworkDiscovered }) => {
  void onNetworkDiscovered;
  return <div className="p-4 text-white">Kismet app placeholder</div>;

};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

