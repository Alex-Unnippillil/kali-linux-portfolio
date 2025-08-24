# Bundle size optimization

- `NEXT_BUILD_ANALYZE=1 yarn build` helped identify large vendor chunks dominated by Chart.js.
- Enabled Next.js `experimental.optimizePackageImports` for `chart.js` and `react-chartjs-2` in `next.config.js` to reduce shared vendor bundle size.
- Converted the PCAP viewer to lazy-load Chart.js via dynamic imports so charts are only bundled when the feature is used.
