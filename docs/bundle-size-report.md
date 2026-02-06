# Bundle Size Comparison

| Route | Metric | Before | After | Delta |
|-------|--------|--------|-------|-------|
| `/nessus-dashboard` | Page bundle size (excludes shared) | 5.46 kB | 0.94 kB | -82.8% |
| `/security-education` | Page bundle size (excludes shared) | 1.36 kB | 1.47 kB | +0.11 kB |

Additional measurements:

- `First Load JS` for `/nessus-dashboard` dropped from 274 kB to 252 kB (−22 kB).
- Shared chunk size remained 270 kB; reductions are localized to dashboard assets.

Source: `yarn build` output before and after refactor.
