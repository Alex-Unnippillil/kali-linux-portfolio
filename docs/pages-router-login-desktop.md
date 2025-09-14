# Pages Router Login and Desktop

This guide shows how to wire up `/pages/login.tsx`, `/pages/desktop.tsx`, and `/pages/api/session.ts` in projects that use the Next.js **Pages Router**. The existing `middleware.ts` continues to work and does not require any changes.

## `/pages/login.tsx`

```tsx
import { useRouter } from 'next/router';
import LockScreen from '../components/screen/lock_screen';

export default function Login() {
  const router = useRouter();
  return (
    <LockScreen
      isLocked={true}
      unLockScreen={() => router.push('/desktop')}
    />
  );
}
```

## `/pages/desktop.tsx`

```tsx
import Desktop from '../components/screen/desktop';

export default function DesktopPage({ session }) {
  const clearSession = async () => {
    await fetch('/api/session', { method: 'DELETE' });
  };
  return <Desktop session={session} clearSession={clearSession} />;
}

export async function getServerSideProps(context) {
  const baseUrl = `http://${context.req.headers.host}`;
  const res = await fetch(`${baseUrl}/api/session`);
  const session = res.ok ? await res.json() : {};
  return { props: { session } };
}
```

## `/pages/api/session.ts`

```ts
import type { NextApiRequest, NextApiResponse } from 'next';

let session: any = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(session || {});
  } else if (req.method === 'POST') {
    session = req.body;
    res.status(200).json({ ok: true });
  } else if (req.method === 'DELETE') {
    session = null;
    res.status(204).end();
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end('Method Not Allowed');
  }
}
```

> The example above keeps session data in memory. Replace it with persistent storage for production deployments.

## Middleware

No updates are needed for `middleware.ts`; it functions the same with the Pages Router.

