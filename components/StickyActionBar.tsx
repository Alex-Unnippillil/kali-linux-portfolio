import { useEffect, useState } from 'react';
import CTAButton from './CTAButton';

const StickyActionBar: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const isLong = document.body.scrollHeight > window.innerHeight * 1.5;
      if (!isLong) {
        setVisible(false);
        return;
      }
      setVisible(window.scrollY > 300);
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-ubt-blue/90 p-3 flex justify-center z-50">
      <CTAButton location="sticky-bar" />
    </div>
  );
};

export default StickyActionBar;
