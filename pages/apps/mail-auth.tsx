import dynamic from 'next/dynamic';
import Head from 'next/head';

const MailAuth = dynamic(() => import('../../apps/mail-auth'), { ssr: false });

export default function MailAuthPage() {
  const ogImage = '/themes/Yaru/apps/mail-auth.svg';
  return (
    <>
      <Head>
        <title>Mail Auth</title>
        <meta property="og:title" content="Mail Auth" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <MailAuth />
    </>
  );
}
