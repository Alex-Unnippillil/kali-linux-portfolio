import { cookies } from 'next/headers';

const THEME_COOKIE = 'kali-theme';

export default async function ThemeServer() {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value ?? 'dark';

  return (
    <span hidden suppressHydrationWarning>
      {theme}
    </span>
  );
}
