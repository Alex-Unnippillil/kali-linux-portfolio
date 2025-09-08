import React from 'react';
import Callout from '../../components/ui/Callout';
import WinKexTile from '../../components/platforms/WinKexTile';

const WSLPage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">WSL</h1>
    <p>Run Kali on Windows Subsystem for Linux.</p>
    <WinKexTile />
    <Callout variant="readDocs">
      <p>
        Read the{' '}
        <a
          href="https://www.kali.org/docs/wsl/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          WSL documentation
        </a>
        {' '}for setup instructions.
      </p>
    </Callout>
  </main>
);

export default WSLPage;
