
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SystemDialog from '../components/ui/SystemDialog';
import { reportClientError } from '../lib/client-error-reporter';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, error.stack);
  }, [error]);

  return (
    <SystemDialog
      isOpen
      title="Application error"
      message="Something went wrong!"
      primary={{ label: 'Try again', onClick: () => reset() }}
      secondary={{ label: 'Go home', onClick: () => router.push('/') }}
    />
  );
}
