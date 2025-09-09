'use client';
import React from 'react';
import stats from './data.json';

interface Stats {
  hosts: number;
  vulnerabilities: number;
  exploits: number;
}

const Dashboard: React.FC = () => {
  const data = stats as Stats;
  return (
    <div className="p-4 bg-gray-900 text-white h-full">
      <h1 className="text-xl mb-4">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-sm">Hosts</div>
          <div className="text-2xl font-bold">{data.hosts}</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-sm">Vulns</div>
          <div className="text-2xl font-bold">{data.vulnerabilities}</div>
        </div>
        <div className="bg-gray-800 rounded p-4 text-center">
          <div className="text-sm">Exploits</div>
          <div className="text-2xl font-bold">{data.exploits}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
