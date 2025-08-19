import React from 'react'
import Head from 'next/head';

export default function Meta() {
    return (
        <Head>
           /* Primary Meta Tags */
            <title>Alex Unnippillil's Portfolio </title>
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
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#E95420" />
            <meta
                httpEquiv="Content-Security-Policy"
                content="default-src 'self'; img-src 'self' data:; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://www.google-analytics.com;"
            />

            /* Search Engine */
            <meta name="image" content="images/logos/fevicon.png" />
            /* Schema.org for Google */
            <meta itemProp="name" content="Alex Unnippillil Portfolio " />
            <meta itemProp="description"
                content="Alex Unnippillil Personal Portfolio Website" />
            <meta itemProp="image" content="images/logos/fevicon.png" />
            /* Twitter */
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="Alex Unnippillil Personal Portfolio Website" />
            <meta name="twitter:description"
                content="Alex Unnippillil Personal Portfolio Website" />
            <meta name="twitter:site" content="alexunnippillil" />
            <meta name="twitter:creator" content="unnippillil" />
            <meta name="twitter:image:src" content="images/logos/logo_1024.png" />
            /* Open Graph general (Facebook, Pinterest & Google+) */
            <meta name="og:title" content="Alex Unnippillil Personal Portfolio Website " />
            <meta name="og:description"
                content="Alex Unnippillil Personal Portfolio Website. ." />
            <meta name="og:image" content="images/logos/logo_1200.png" />
            <meta name="og:url" content="https://github.com/Alex-Unnippillil" />
            <meta name="og:site_name" content="Alex Unnippillil Personal Portfolio" />
            <meta name="og:locale" content="en_IN" />
            <meta name="og:type" content="website" />

            <link rel="icon" href="images/logos/fevicon.svg" />
            <link rel="apple-touch-icon" href="images/logos/logo.png" />
            <link rel="preload" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap" as="style" />
            <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap" rel="stylesheet"></link>
        </Head>
    )
}
