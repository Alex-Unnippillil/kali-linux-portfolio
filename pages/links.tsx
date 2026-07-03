import { useEffect, useState } from 'react';
import Head from 'next/head';
import Meta from '../components/SEO/Meta';

interface LinkItem {
  href: string;
  label: string;
  note: string;
}

const links: LinkItem[] = [
  {
    href: 'https://github.com/unnippillil',
    label: 'GitHub',
    note: 'Open-source projects & contributions.',
  },
  {
    href: 'https://www.linkedin.com/in/unnippillil',
    label: 'LinkedIn',
    note: 'Professional updates and networking.',
  },
  {
    href: 'mailto:alex@unnippillil.com',
    label: 'Email',
    note: 'Direct contact for collaborations.',
  },
  {
    href: 'https://twitter.com/unnippillil',
    label: 'X (Twitter)',
    note: 'Quick thoughts and announcements.',
  },
];

export default function LinksPage() {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((mod) => mod.toDataURL(window.location.href))
      .then((src) => {
        if (active) setQrSrc(src);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Meta />
      <Head>
        <title>Connect with Alex</title>
        <meta name="title" content="Connect with Alex" />
        <meta
          name="description"
          content="Find the right platform to contact Alex Unnippillil."
        />
        <meta property="og:title" content="Connect with Alex" />
        <meta
          property="og:description"
          content="Find the right platform to contact Alex Unnippillil."
        />
        <meta property="og:url" content="https://unnippillil.com/links" />
        <meta
          property="og:image"
          content="https://unnippillil.com/images/logos/logo_1200.png"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Connect with Alex" />
        <meta
          name="twitter:description"
          content="Find the right platform to contact Alex Unnippillil."
        />
        <meta
          name="twitter:image"
          content="https://unnippillil.com/images/logos/logo_1200.png"
        />
      </Head>
      <main className="p-4">
        <h1 className="mb-4 text-2xl font-bold">Connect</h1>
        <p className="mb-4">Choose the platform that matches your needs.</p>
        <ul>
          {links.map((link) => (
            <li key={link.href} className="mb-3">
              <a
                href={link.href}
                className="text-blue-500 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
              <p className="text-sm text-gray-400">{link.note}</p>
            </li>
          ))}
        </ul>
        {qrSrc && (
          <div className="mt-6">
            <p className="mb-2">Scan to open on your phone:</p>
            <img src={qrSrc} alt="QR code to this page" className="h-40 w-40" />
          </div>
        )}
      </main>
    </>
  );
}

