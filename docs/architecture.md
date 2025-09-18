# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

For setup instructions, see the [Getting Started](./getting-started.md) guide.

## YouTube embeds

- Players are instantiated against the privacy-enhanced host
  (`https://www.youtube-nocookie.com`) and always receive `playerVars` with
  `rel=0`, `modestbranding=1`, `enablejsapi=1`, and the current `origin` when
  available.
- YouTube no longer suppresses related videos entirely; in privacy-enhanced
  mode, `rel=0` only limits suggestions to the same channel, so the UI warns
  users about the limitation.
