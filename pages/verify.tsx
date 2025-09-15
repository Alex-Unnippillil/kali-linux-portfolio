import React from 'react';
import { WindowMainScreen } from '../components/base/window';

const VerifyCli = () => (
  <WindowMainScreen
    screen={() => (
      <div className="p-4 space-y-4">
        <div
          className="bg-yellow-300 text-black p-4 rounded"
          role="alert"
        >
          <p className="font-bold">Warning</p>
          <p>
            The verification CLI installs dependencies, runs tests, and starts
            the project locally. Inspect the source and run it only in
            environments you trust.
          </p>
        </div>
        <p>Run all checks with:</p>
        <pre className="bg-black text-green-400 p-2 rounded"><code>npx @kali/verify</code></pre>
        <p>
          This command verifies Node and yarn versions, lints, type-checks,
          builds the project, and performs a basic smoke test against key
          routes.
        </p>
      </div>
    )}
  />
);

export default VerifyCli;
