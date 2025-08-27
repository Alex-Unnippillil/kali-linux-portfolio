import React from 'react';
import Ubuntu from '../components/ubuntu';
import Meta from '../components/SEO/Meta';
import InstallButton from '../components/InstallButton';
import MockTerminal from '../components/MockTerminal';

const App: React.FC = () => (
  <>
    <Meta />
    <main id="main-content" aria-label="Main content">
      <Ubuntu />
      <InstallButton />
      <div className="p-4">
        <MockTerminal />
      </div>
    </main>
  </>
);

export default App;
