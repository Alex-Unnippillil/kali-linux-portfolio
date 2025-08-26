import React from 'react';

const LegalBanner: React.FC = () => (
  <div className="bg-red-700 text-white text-center text-sm p-2">
    Use this project responsibly and within legal boundaries. Unauthorized access or malicious activity is prohibited. Visit the{' '}
    <a href="https://www.kali.org/docs/" className="underline" target="_blank" rel="noopener noreferrer">official Kali Linux documentation</a> for guidance.
  </div>
);

export default LegalBanner;

