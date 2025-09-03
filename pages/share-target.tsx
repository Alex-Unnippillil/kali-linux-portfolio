import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ShareTarget() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    const title = searchParams.get('title');
    const text = searchParams.get('text');
    const url = searchParams.get('url');
    if (title) params.set('title', title);
    if (text) params.set('text', text);
    if (url) params.set('url', url);

    if ('launchQueue' in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length) {
          const fileInfos = await Promise.all(
            launchParams.files.map(async (f: any) => {
              const file = await f.getFile();
              return { name: file.name, type: file.type };
            })
          );
          params.set('files', encodeURIComponent(JSON.stringify(fileInfos)));
        }
        router.replace(`/input-hub?${params.toString()}`);
      });
    } else {
      router.replace(`/input-hub?${params.toString()}`);
    }
  }, [router, searchParams]);

  return <p>Loading...</p>;
}
