import { useRouter } from 'next/navigation';

export default function Example() {
  const router = useRouter();
  return <button onClick={() => router.push('/')}>Go home</button>;
}
