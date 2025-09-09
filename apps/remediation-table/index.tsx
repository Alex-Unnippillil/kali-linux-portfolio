'use client';
import React from 'react';
import RemediationTable from './RemediationTable';

const RemediationApp: React.FC = () => (
  <div className="p-4 bg-gray-900 text-white h-full">
    <h1 className="text-xl mb-4">Remediation Guide</h1>
    <RemediationTable />
  </div>
);

export default RemediationApp;
