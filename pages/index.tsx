import React from 'react';
import Image from 'next/image';
import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';

const App: React.FC = () => (
  <>
    <Meta />
    <Ubuntu />
    {/* Optimized logo using Next.js Image component */}
    <div className="mx-auto mt-8 w-24 h-24">
      <Image
        src="/images/logos/logo_1024.png"
        alt="Logo"
        width={1024}
        height={1024}
        priority
      />
    </div>
  </>
);

export default App;
