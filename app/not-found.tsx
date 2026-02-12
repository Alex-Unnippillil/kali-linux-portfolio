'use client';

import { useRouter } from 'next/navigation';
import SystemDialog from '../components/ui/SystemDialog';

export default function NotFound() {
  const router = useRouter();

  return (
    <SystemDialog
      isOpen
      title="Page not found"
      message="The page you are looking for does not exist."
      primary={{ label: 'Go home', onClick: () => router.push('/') }}
      secondary={{ label: 'Back', onClick: () => router.back() }}
    />
  );
}

