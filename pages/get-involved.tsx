import React from 'react';

const GetInvolvedPage: React.FC = () => (
  <div className="p-8 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold mb-4">Get Involved</h1>
    <p className="mb-4">
      Kali Linux Portfolio is an open, unofficial effort driven by our community. Your ideas and
      contributions help shape its future.
    </p>
    <ul className="list-disc pl-6 mb-4">
      <li>Report bugs or request features through the issue tracker.</li>
      <li>Improve the interface and docs with pull requests.</li>
      <li>Share feedback and suggestions with fellow contributors.</li>
    </ul>
    <p>
      For guidance on contributing to Kali Linux itself, visit the{' '}
      <a
        href="https://www.kali.org/docs/community/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        official Kali documentation
      </a>
      .
    </p>
  </div>
);

export default GetInvolvedPage;

