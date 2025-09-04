import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const NotFound = () => {
  const [errorId, setErrorId] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setErrorId(Math.random().toString(36).slice(2, 10));
    setTimestamp(new Date().toLocaleString());
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-6">
      <Image src="/images/errors/404.svg" alt="Not found" width={150} height={150} />
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="text-gray-600">The page you&apos;re looking for doesn&apos;t exist.</p>
      <nav className="space-x-4">
        <Link href="/" className="text-blue-500 underline">Home</Link>
        <Link href="/apps/project-gallery" className="text-blue-500 underline">Projects</Link>
        <Link href="/apps/contact" className="text-blue-500 underline">Contact</Link>
      </nav>
      <p className="text-sm text-gray-500">Error ID: {errorId} • {timestamp}</p>
    </div>
  );
};

export default NotFound;
