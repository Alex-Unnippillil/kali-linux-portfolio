import { useRouter } from 'next/router';

export default function Example() {
  const router = useRouter();
  return <button onClick={() => router.push('/')}>Go home</button>;
}
