import Head from 'next/head';
import type { ReactElement } from 'react';
import Desktop from '../../components/window-system/Desktop';

const WindowSystemPage = (): ReactElement => (
  <>
    <Head>
      <title>Kali Portfolio – Window System Demo</title>
    </Head>
    <Desktop />
  </>
);

export default WindowSystemPage;
