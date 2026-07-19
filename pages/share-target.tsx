"use client";

import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';

export default function ShareTarget() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams();
    const { title, text, url } = router.query;
    if (title) params.set('title', String(title));
    if (text) params.set('text', String(text));
    if (url) params.set('url', String(url));

    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length) {
          const fileInfos = await Promise.all(
            launchParams.files.map(async (f: any) => {
              const file = await f.getFile();
              return { name: file.name, type: file.type };
            })
          );
          if (fileInfos.length) {
            const serialized = JSON.stringify(fileInfos);
            if (serialized) {
              params.set('files', serialized);
            }
          }
        }
        router.replace(`/input-hub?${params.toString()}`);
      });
    } else {
      router.replace(`/input-hub?${params.toString()}`);
    }
  }, [router]);

  return (
    <>
      <Head>
        <link rel="canonical" href="https://unnippillil.com/share-target" />
      </Head>
      <p>Loading...</p>
    </>
  );
}
