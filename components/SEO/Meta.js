import React from 'react'
import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';

export default function Meta() {
    const nonce = getCspNonce();
    return (
        <Head>
            {/* Primary Meta Tags */}
             <title>Alex Unnippillil&apos;s Kali-style Desktop Portfolio</title>
            <meta charSet="utf-8" />
            <meta name="title" content="Alex Unnippillil's Kali-style Desktop Portfolio" />
            <meta name="description"
                content="Explore Alex Unnippillil's Kali-style desktop portfolio showcasing projects and skills." />
            <meta name="author" content="Alex Unnippillil" />
            <meta name="keywords"
                content="Alex Unnippillil, Unnippillil's portfolio, linux, kali portfolio, alex unnippillil portfolio, alex computer, alex unnippillil, alex linux, alex unnippillil kali portfolio" />
            <meta name="robots" content="index, follow" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="language" content="English" />
            <meta name="category" content="16" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#0f1317" />

            {/* Search Engine */}
            <meta name="image" content="images/logos/fevicon.png" />
            {/* Schema.org for Google */}
            <meta itemProp="name" content="Alex Unnippillil's Kali-style Desktop Portfolio" />
            <meta itemProp="description"
                content="Explore Alex Unnippillil's Kali-style desktop portfolio showcasing projects and skills." />
            <meta itemProp="image" content="images/logos/fevicon.png" />
            {/* Twitter */}
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="Alex Unnippillil's Kali-style Desktop Portfolio" />
            <meta name="twitter:description"
                content="Explore Alex Unnippillil's Kali-style desktop portfolio showcasing projects and skills." />
            <meta name="twitter:site" content="alexunnippillil" />
            <meta name="twitter:creator" content="unnippillil" />
            <meta name="twitter:image:src" content="https://unnippillil.com/images/hero.png" />
            {/* Open Graph general (Facebook, Pinterest & Google+) */}
            <meta name="og:title" content="Alex Unnippillil's Kali-style Desktop Portfolio" />
            <meta name="og:description"
                content="Explore Alex Unnippillil's Kali-style desktop portfolio showcasing projects and skills." />
            <meta name="og:image" content="https://unnippillil.com/images/hero.png" />
            <meta name="og:url" content="https://unnippillil.com/" />
            <meta name="og:site_name" content="Alex Unnippillil Personal Portfolio" />
            <meta name="og:locale" content="en_CA" />
            <meta name="og:type" content="website" />

            <link rel="canonical" href="https://unnippillil.com/" />
            <link rel="icon" href="images/logos/fevicon.svg" />
            <link rel="apple-touch-icon" href="images/logos/logo.png" />
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
