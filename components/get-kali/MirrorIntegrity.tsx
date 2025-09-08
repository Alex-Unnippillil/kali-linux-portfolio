import React from 'react';
import Callout from '../ui/Callout';

export default function MirrorIntegrity() {
  return (
    <div className="space-y-4">
      <Callout variant="mirrorInfo">
        <p>
          Downloads are automatically served from the nearest mirror for better performance. View the{' '}
          <a
            href="https://http.kali.org/README.mirrorlist"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            full mirror list
          </a>
          .
        </p>
      </Callout>
      <Callout variant="verifyDownload">
        <p>
          Download images securely by verifying signatures or hashes.{' '}
          <a
            href="https://www.kali.org/docs/introduction/download-images-securely/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Learn how
          </a>
          .
        </p>
      </Callout>
    </div>
  );
}

