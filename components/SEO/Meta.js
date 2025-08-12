import React from 'react'
import Head from 'next/head';

export const defaultMeta = {
    title: "Alex Unnippillil's Portfolio",
    description: "Alex Unnippillil Personal Portfolio Website",
    image: "images/logos/fevicon.png"
};

export const buildMeta = (props = {}) => ({ ...defaultMeta, ...props });

export default function Meta(props = {}) {
    const { title, description, image } = buildMeta(props);

    return (
        <Head>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta charSet="utf-8" />
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            <meta name="author" content="Alex Unnippillil" />
            <meta name="keywords"
                content="Alex Unnippillil, Unnippillil's portfolio, linux, kali portfolio, alex unnippillil portfolio, alex computer, alex unnippillil, alex linux, alex unnippillil kali portfolio" />
            <meta name="robots" content="index, follow" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="language" content="English" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content="#E95420" />

            {/* Search Engine */}
            <meta name="image" content={image} />
            {/* Schema.org for Google */}
            <meta itemProp="name" content={title} />
            <meta itemProp="description" content={description} />
            <meta itemProp="image" content={image} />
            {/* Twitter */}
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:site" content="alexunnippillil" />
            <meta name="twitter:creator" content="unnippillil" />
            <meta name="twitter:image:src" content={image} />
            {/* Open Graph general (Facebook, Pinterest & Google+) */}
            <meta name="og:title" content={title} />
            <meta name="og:description" content={description} />
            <meta name="og:image" content={image} />
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
