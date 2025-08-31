import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

interface Props {
  location?: string;
}

const VARIANTS = ['Install Now', 'Get Started'];

const CTAButton: React.FC<Props> = ({ location = 'default' }) => {
  const [label, setLabel] = useState(VARIANTS[0]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') {
      setLabel(Math.random() < 0.5 ? VARIANTS[0] : VARIANTS[1]);
    }
  }, []);

  const handleClick = () => {
    trackEvent('cta_click', { location });
  };

  return (
    <button
      onClick={handleClick}
      className="bg-ubt-blue text-white px-4 py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-white"
    >
      {label}
    </button>
  );
};

export default CTAButton;
