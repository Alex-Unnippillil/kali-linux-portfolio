'use client';

import React from 'react';
import Radare2 from '../../components/apps/radare2';
import fixtures from './fixtures.json';

const Radare2Page: React.FC = () => {
  return <Radare2 initialData={fixtures} />;
};

export default Radare2Page;
