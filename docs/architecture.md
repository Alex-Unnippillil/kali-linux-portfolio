# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

For setup instructions, see the [Getting Started](./getting-started.md) guide.

## Window switcher previews

The desktop Alt+Tab switcher (`components/system/Switcher.tsx`) captures live window
thumbnails using `html-to-image` and keeps them in an LRU cache that is capped at 10 MB.
When the budget is exceeded the cache recycles the oldest preview before storing the
new image, ensuring the total memory footprint stays bounded. The UI exposes a small
"Cache" readout so you can verify usage at a glance, and the component logs detailed
heap information to the console (when available) to help profile memory while testing.
