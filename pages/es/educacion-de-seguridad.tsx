import { useRouter } from 'next/router';
import SecurityEducation from '../security-education';
import { t } from '../../utils/i18n';

export default function SecurityEducationES() {
  const { locale = 'es' } = useRouter();
  return (
    <>
      <div className="p-4 text-center text-red-600">
        {t(locale, 'fallback.missing')}
      </div>
      <SecurityEducation />
    </>
  );
}
