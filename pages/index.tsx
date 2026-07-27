import type { ReactElement } from 'react';
import Meta from '../components/SEO/Meta';
import BetaBadge from '../components/BetaBadge';
import Ubuntu from '../components/ubuntu';

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Alex Unnippillil Portfolio Home',
    url: 'https://unnippillil.com/',
    description:
      'Explore a Kali-inspired desktop portfolio featuring security tool simulations, retro games, and productivity utilities.',
    inLanguage: 'en-CA',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://unnippillil.com/',
      },
    ],
  },
];

const App = (): ReactElement => (
  <>
    <a href="#window-area" className="sr-only focus:not-sr-only">
      Skip to content
    </a>
    <Meta
      title="Home"
      description="Experience Alex Unnippillil's Kali-inspired desktop portfolio with simulated security tooling, retro games, and productivity utilities."
      canonical="/"
      jsonLd={homeJsonLd}
    />
    <Ubuntu />
    <BetaBadge />
  </>
);

export default App;
