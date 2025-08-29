'use client';

import React from 'react';
import AutopsyApp from '../../components/apps/autopsy';
import events from './events.json';

const AutopsyPage: React.FC = () => {
  return <AutopsyApp initialArtifacts={events.artifacts as any} />;
};

export default AutopsyPage;
