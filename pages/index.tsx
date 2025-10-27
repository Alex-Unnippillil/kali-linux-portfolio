import type { ReactElement } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

const App = (): ReactElement => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta
      title="Alex Unnippillil — Offensive Security Portfolio"
      description="Explore Alex Unnippillil's Kali-inspired desktop portfolio featuring offensive security labs, red team tooling simulations, and playful retro utilities."
      canonicalPath="/"
      og={{
        title: 'Kali Desktop Portfolio',
        subtitle: 'Security labs • Tool simulations • Retro experiences',
        badges: ['Edge-ready OG images', 'Red Team Simulations', 'Kali UI'],
        project: 'portfolio-desktop',
        image: '/images/logos/logo_1200.png',
      }}
    />
    <Ubuntu />
    <BetaBadge />
  </>
);

export default App;
