'use client';

import React from 'react';
import Radare2 from '@/components/apps/radare2';
import sample from './sample.json';

const Radare2Page: React.FC = () => {
  return <Radare2 initialData={sample} />;
};

export default Radare2Page;
