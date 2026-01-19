import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import MobileLanding, {
  MOBILE_BREAKPOINT,
} from '../components/screen/MobileLanding';
import Ubuntu from '../components/ubuntu';

const useViewportWidth = (): number | null => {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = (): void => {
      setWidth(window.innerWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return width;
};

const App = (): ReactElement => {
  const viewportWidth = useViewportWidth();
  const shouldShowMobile =
    viewportWidth === null || viewportWidth < MOBILE_BREAKPOINT;

  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Meta />
      {shouldShowMobile ? <MobileLanding /> : <Ubuntu />}
      <BetaBadge />
    </>
  );
};

export default App;
