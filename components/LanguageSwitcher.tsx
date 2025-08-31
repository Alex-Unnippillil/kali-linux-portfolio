import { useRouter } from 'next/router';
import { localizePath } from '../utils/locale-paths';
import { t } from '../utils/i18n';

interface Props {
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const router = useRouter();
  const { locale = 'en', asPath } = router;

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const path = localizePath(asPath, newLocale);
    router.push(path, path, { locale: newLocale });
  };

  return (
    <select
      aria-label={t(locale, 'switcher.label')}
      value={locale}
      onChange={changeLanguage}
      className={`border rounded px-1 py-0.5 text-xs bg-ub-grey text-ubt-grey focus:outline-none ${
        compact ? 'h-6' : ''
      }`}
    >
      <option value="en">EN</option>
      <option value="es">ES</option>
    </select>
  );
}
