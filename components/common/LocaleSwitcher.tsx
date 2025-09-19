import { ChangeEvent } from 'react';
import { useLocale } from '../../hooks/useLocale';

interface Props {
  className?: string;
}

const LocaleSwitcher = ({ className }: Props) => {
  const { locale, setLocale, options, isLoading, t } = useLocale();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setLocale(event.target.value);
  };

  return (
    <label className={`flex flex-col gap-1 text-ubt-grey ${className ?? ''}`}>
      <span className="text-sm font-medium">{t('quickSettings.locale.label')}</span>
      <div
        className="relative"
        data-testid="locale-select-wrapper"
        style={{ minWidth: '8.5rem' }}
      >
        <select
          value={locale}
          onChange={handleChange}
          aria-label={t('quickSettings.locale.label')}
          title={t('quickSettings.locale.placeholder')}
          data-testid="locale-select"
          disabled={isLoading}
          className="w-full appearance-none rounded border border-ubt-cool-grey bg-ub-cool-grey px-2 py-1 text-sm text-ubt-grey focus:border-ubb-orange focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-ubt-grey">
          ▾
        </span>
      </div>
    </label>
  );
};

export default LocaleSwitcher;
