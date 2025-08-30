# Dependency Report

## Environment Versions
- Node.js: 20.19.4
- Yarn: 4.9.2

## Install Warnings
- react@19.1.1 and react-dom@19.1.1 do not satisfy peer ranges for react-onclickoutside and others.
- Missing peer: leaflet requested by react-leaflet.
- Some peer dependencies marked incorrectly met; `yarn explain peer-requirements` can provide details.
- Rebuild required for sharp, unrs-resolver, @vercel/speed-insights.
- puppeteer built for the first time.

## Package Traces
- `glob` is pulled in by jest components, npm tooling, and others.
- `inflight` is required via `glob@7.2.3`.
- `source-map` is required by escodegen, handlebars, source-map-support, and workbox-build.

Full installation output is saved in `install.log`.
