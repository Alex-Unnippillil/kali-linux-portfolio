import Head from 'next/head';

import { getCspNonce } from '../../utils/csp';

type JsonLdPersonProps = {
  name: string;
  url: string;
};

const JsonLdPerson = ({ name, url }: JsonLdPersonProps) => {
  const nonce = getCspNonce();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
};

export default JsonLdPerson;
