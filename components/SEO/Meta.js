import React from 'react'
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCspNonce } from '../../utils/csp';
import { t } from '../../utils/i18n';

export default function Meta() {
    const nonce = getCspNonce();
    let locale = 'en';
    try {
        locale = useRouter().locale || 'en';
    } catch {
        locale = 'en';
    }
    const title = t(locale, 'meta.title');
    const description = t(locale, 'meta.description');
    return (
        <Head>
            {/* Primary Meta Tags */}
             <title>{title} </title>
            <meta charSet="utf-8" />
            <meta name="title" content={title} />
            <meta name="description"
                content={description} />
            <meta name="author" content="Alex Unnippillil" />
            <meta name="keywords"
                content="Alex Unnippillil, Unnippillil's portfolio, linux, kali portfolio, alex unnippillil portfolio, alex computer, alex unnippillil, alex linux, alex unnippillil kali portfolio" />
            <meta name="robots" content="index, follow" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="language" content={locale === 'es' ? 'Spanish' : 'English'} />
            <meta name="category" content="16" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#0f1317" />

            {/* Search Engine */}
            <meta name="image" content="images/logos/fevicon.png" />
            {/* Schema.org for Google */}
            <meta itemProp="name" content={title + ' '} />
            <meta itemProp="description"
                content={description} />
            <meta itemProp="image" content="images/logos/fevicon.png" />
            {/* Twitter */}
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description"
                content={description} />
            <meta name="twitter:site" content="alexunnippillil" />
            <meta name="twitter:creator" content="unnippillil" />
            <meta name="twitter:image:src" content="images/logos/logo_1024.png" />
            {/* Open Graph general (Facebook, Pinterest & Google+) */}
            <meta name="og:title" content={title + ' '} />
            <meta name="og:description"
                content={description} />
            <meta name="og:image" content="https://unnippillil.com/images/logos/logo_1200.png" />
            <meta name="og:url" content="https://unnippillil.com/" />
            <meta name="og:site_name" content="Alex Unnippillil Personal Portfolio" />
            <meta name="og:locale" content={locale === 'es' ? 'es_ES' : 'en_CA'} />
            <meta name="og:type" content="website" />

            <link rel="canonical" href="https://unnippillil.com/" />
            <link rel="icon" href="images/logos/fevicon.svg" />
            <link rel="apple-touch-icon" href="images/logos/logo.png" />
            <link
                rel="preload"
                href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap"
                as="style"
                crossOrigin="anonymous"
            />
            <link
                href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap"
                rel="stylesheet"

            />
            <script
                type="application/ld+json"
                nonce={nonce}
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Person",
                        name: "Alex Unnippillil",
                        url: "https://unnippillil.com/",
                    }),
                }}
            />
        </Head>
    )
}
