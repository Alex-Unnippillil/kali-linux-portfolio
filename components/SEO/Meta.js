import React from 'react'
import Head from 'next/head';
import { getCspNonce } from '../../utils/csp';

export default function Meta() {
    const nonce = getCspNonce();
    return (
        <Head>
            {/* Primary Meta Tags */}
             <title>Alex Unnippillil&apos;s Portfolio </title>
            <meta charSet="utf-8" />
            <meta name="title" content="Alex Patel Portfolio - Computer Engineering Student" />
            <meta name="description"
                content="Alex Unnippillil Personal Portfolio Website" />
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
            <meta name="image" content="/icons/256/brand-filled.svg" />
            {/* Schema.org for Google */}
            <meta itemProp="name" content="Alex Unnippillil Portfolio " />
            <meta itemProp="description"
                content="Alex Unnippillil Personal Portfolio Website" />
            <meta itemProp="image" content="/icons/256/brand-filled.svg" />
            {/* Twitter */}
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="Alex Unnippillil Personal Portfolio Website" />
            <meta name="twitter:description"
                content="Alex Unnippillil Personal Portfolio Website" />
            <meta name="twitter:site" content="alexunnippillil" />
            <meta name="twitter:creator" content="unnippillil" />
            <meta name="twitter:image:src" content="images/logos/logo_1024.png" />
            {/* Open Graph general (Facebook, Pinterest & Google+) */}
            <meta name="og:title" content="Alex Unnippillil Personal Portfolio Website " />
            <meta name="og:description"
                content="Alex Unnippillil Personal Portfolio Website. ." />
            <meta name="og:image" content="https://unnippillil.com/images/logos/logo_1200.png" />
            <meta name="og:url" content="https://unnippillil.com/" />
            <meta name="og:site_name" content="Alex Unnippillil Personal Portfolio" />
            <meta name="og:locale" content="en_CA" />
            <meta name="og:type" content="website" />

            <link rel="canonical" href="https://unnippillil.com/" />
            <link rel="icon" type="image/svg+xml" href="/icons/brand-outline.svg" />
            <link rel="icon" type="image/svg+xml" sizes="48x48" href="/icons/48/brand-outline.svg" />
            <link rel="icon" type="image/svg+xml" sizes="64x64" href="/icons/64/brand-outline.svg" />
            <link rel="icon" type="image/svg+xml" sizes="128x128" href="/icons/128/brand-outline.svg" />
            <link rel="icon" type="image/svg+xml" sizes="256x256" href="/icons/256/brand-outline.svg" />
            <link rel="apple-touch-icon" href="/icons/256/brand-filled.svg" />
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
