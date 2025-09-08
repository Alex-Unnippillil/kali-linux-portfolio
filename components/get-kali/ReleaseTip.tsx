import React from 'react';
import Link from 'next/link';
import Callout from '../ui/Callout';

export default function ReleaseTip() {
  return (
    <Callout variant="readDocs">
      <p>
        Kali uses a rolling release model. Quarterly versions are just fresh snapshots
        of the latest packages. Install once and keep updating to stay current.{' '}
        <Link
          href="https://www.kali.org/docs/policy/release-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Learn more
        </Link>
        .
      </p>
    </Callout>
  );
}
