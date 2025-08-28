'use client';

import React from 'react';
import WiresharkApp from '../../components/apps/wireshark';
import tinyCapture from './tinyCapture.json';

const WiresharkPage: React.FC = () => {
  return <WiresharkApp initialPackets={tinyCapture} />;
};

export default WiresharkPage;
