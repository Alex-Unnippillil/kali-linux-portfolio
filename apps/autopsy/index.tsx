'use client';

import React from 'react';
import AutopsyApp from '../../components/apps/autopsy';
import events from './events.json';
import KeywordTester from './components/KeywordTester';

const AutopsyPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <AutopsyApp initialArtifacts={events.artifacts} />
      <KeywordTester />
    </div>
  );
};

export default AutopsyPage;
