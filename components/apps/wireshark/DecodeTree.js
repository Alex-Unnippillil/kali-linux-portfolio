'use client';
import React from 'react';

const DecodeTree = ({ data }) => {
  if (!data || typeof data !== 'object') return null;
  return (
    <ul className="pl-4 list-disc">
      {Object.entries(data).map(([key, value]) => (
        <li key={key} className="mb-1">
          <span className="font-semibold">{key}:</span>{' '}
          {typeof value === 'object' ? <DecodeTree data={value} /> : String(value)}
        </li>
      ))}
    </ul>
  );
};

export default DecodeTree;
