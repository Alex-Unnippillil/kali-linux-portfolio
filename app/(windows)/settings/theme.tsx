import { cookies } from 'next/headers';

export default async function Theme() {
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value ?? 'default';

  return <span suppressHydrationWarning>{theme}</span>;
}
