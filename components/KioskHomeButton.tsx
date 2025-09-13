"use client";

import React from 'react';
import WhiskerMenu from './menu/WhiskerMenu';

const KioskHomeButton: React.FC = () => (
  <div className="fixed bottom-4 left-4 z-50">
    <WhiskerMenu compact />
  </div>
);

export default KioskHomeButton;

