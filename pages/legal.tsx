import React from 'react';

const LegalPage: React.FC = () => (
  <div className="p-8 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">Legal Notice</h1>
    <p className="mb-4">
      This portfolio is an independent project and is not affiliated with or endorsed by Kali Linux, Offensive Security, or any of their subsidiaries.
    </p>
    <p>
      Kali Linux is a registered trademark of Offensive Security. For information on proper use of the Kali trademarks, please see the{' '}
      <a
        href="https://www.kali.org/trademark-policy/"
        className="text-blue-500 underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Kali Linux trademark policy
      </a>.
    </p>
  </div>
);

export default LegalPage;
