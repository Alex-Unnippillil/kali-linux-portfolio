import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const ServerError = () => {
  const [errorId, setErrorId] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setErrorId(Math.random().toString(36).slice(2, 10));
    setTimestamp(new Date().toLocaleString());
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-6">
      <Image src="/images/errors/500.svg" alt="Server error" width={150} height={150} />
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p className="text-gray-600">We&apos;re working to fix the problem.</p>
      <nav className="space-x-4">
        <Link href="/" className="text-blue-500 underline">Home</Link>
        <Link href="/apps/project-gallery" className="text-blue-500 underline">Projects</Link>
        <Link href="/apps/contact" className="text-blue-500 underline">Contact</Link>
      </nav>
      <p className="text-sm text-gray-500">Error ID: {errorId} • {timestamp}</p>
    </div>
  );
};

export default ServerError;
