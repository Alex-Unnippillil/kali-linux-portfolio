import React from 'react';
import dynamic from 'next/dynamic';

const PopularModules = dynamic(
  () =>
    import('../components/PopularModules').catch((err) => {
      console.error('Failed to load PopularModules', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-center text-sm text-gray-400">Loading modules…</div>
    ),
  }
);

const PopularModulesPage: React.FC = () => {
  return <PopularModules />;
};

export default PopularModulesPage;

