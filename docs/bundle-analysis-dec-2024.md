# Bundle analysis — December 2024

This document tracks the bundle changes made while converting heavy client apps to dynamic imports.

## Build commands

- Baseline: `CI=1 yarn build > build-initial.log`
- Optimized: `CI=1 yarn build > build-after.log`

## Key routes

| Route | Before size | Before first load JS | After size | After first load JS |
| --- | --- | --- | --- | --- |
| `/qr` | 122 kB | 391 kB | 1.93 kB | 258 kB |
| `/daily-quote` | 20 kB | 281 kB | 1.95 kB | 258 kB |
| `/notes` | 42.2 kB | 299 kB | 1.91 kB | 258 kB |
| `/post_exploitation` | 15.1 kB | 276 kB | 1.94 kB | 258 kB |

The optimized build also dropped the shared “First Load JS” for the `/qr` route from 391 kB to 258 kB by deferring the QR libraries and Supabase client until they are required.

