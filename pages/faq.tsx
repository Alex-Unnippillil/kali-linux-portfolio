import React from 'react';

const FaqPage: React.FC = () => {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">FAQ</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">How does automatic mirror selection work?</h2>
        <p>
          We automatically redirect your downloads to the nearest and fastest mirror based on your
          location. This ensures quicker downloads and a more reliable connection.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Are the mirrors up to date?</h2>
        <p>
          Yes. Mirrors are checked regularly and synced with the official Kali Linux repositories so
          you always receive the latest packages and images.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Choose mirror</h2>
        <select
          disabled
          className="border rounded p-2 bg-gray-100 text-gray-700"
          defaultValue="automatic"
        >
          <option value="automatic">Automatic (recommended)</option>
          <option value="mirror-1">Mirror 1</option>
          <option value="mirror-2">Mirror 2</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">Manual mirror selection coming soon.</p>
      </section>
    </main>
  );
};

export default FaqPage;
