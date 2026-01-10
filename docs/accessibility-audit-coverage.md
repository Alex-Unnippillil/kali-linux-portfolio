# Accessibility audit coverage

This document summarizes the automated accessibility checks that now run in CI and how to act on any failures.

## Tooling overview

The accessibility suite is composed of two independent passes:

- **Playwright + axe-core** runs the scripted audit in [`playwright/a11y.spec.ts`](../playwright/a11y.spec.ts) via the [`playwright/a11y.config.ts`](../playwright/a11y.config.ts) configuration. It asserts that every route keeps the number of `critical` and `serious` axe impacts at zero while tracking the remaining categories for future cleanup.
- **pa11y-ci** crawls the same surface area with both the HTML CodeSniffer and axe runners enabled, enforcing zero `error` or `warning` level issues so regressions in critical/serious findings fail the build immediately.

Both tools execute against the development server on `http://localhost:3000` so that parity with production markup is preserved.

## Routes under test

### Top-level pages

The following top-level Next.js pages are exercised by both suites:

- `/`
- `/apps`
- `/admin/messages`
- `/daily-quote`
- `/dummy-form`
- `/gamepad-calibration`
- `/hook-flow`
- `/hydra-preview`
- `/input-hub`
- `/keyboard-reference`
- `/module-workspace`
- `/nessus-dashboard`
- `/nessus-report`
- `/network-topology`
- `/nikto-report`
- `/notes`
- `/popular-modules`
- `/post_exploitation`
- `/profile`
- `/qr`
- `/qr/vcard`
- `/recon/graph`
- `/security-education`
- `/sekurlsa_logonpasswords`
- `/share-target`
- `/spoofing`
- `/video-gallery`
- `/wps-attack`

### Representative windows

A cross-section of application windows is also audited to cover productivity, security tooling, and entertainment use cases:

- `/apps/2048`
- `/apps/blackjack`
- `/apps/beef`
- `/apps/converter`
- `/apps/firefox`
- `/apps/input-lab`
- `/apps/john`
- `/apps/kismet`
- `/apps/metasploit`
- `/apps/metasploit-post`
- `/apps/nmap-nse`
- `/apps/project-gallery`
- `/apps/qr`
- `/apps/solitaire`
- `/apps/spotify`
- `/apps/ssh`
- `/apps/subnet-calculator`
- `/apps/tower-defense`
- `/apps/volatility`
- `/apps/vscode`
- `/apps/weather_widget`
- `/apps/wireshark`
- `/apps/word_search`
- `/apps/x`

When you add a new top-level page or want to cover an additional window, update both the Playwright spec and `pa11yci.json` so the coverage stays aligned.

## Running the audits locally

1. Install dependencies with `yarn install --immutable` if you have not already.
2. Start the development server: `yarn dev`.
3. In a second terminal run `npx pa11y-ci --config pa11yci.json`.
4. Run the scripted axe checks with `npx playwright test --config=playwright/a11y.config.ts`.

> Tip: append `--reporter=list,html` when invoking Playwright locally to produce an HTML report (`playwright-report/index.html`) that makes it easier to inspect offending nodes.

## CI workflow

The [`Accessibility`](../.github/workflows/a11y.yml) workflow now runs on pushes to `main`, every pull request, and manual dispatches. It boots the development server once, executes pa11y-ci, then runs the Playwright suite. The job fails as soon as either tool reports a blocking violation, preventing regressions from merging unnoticed.

## Remediation workflow

When a check fails:

1. Reproduce the failure locally using the commands above so you can iterate quickly.
2. Inspect the console output. pa11y-ci lists the selector, offending rule, and severity. For Playwright, re-run with `--reporter=list,html` and open the generated report for node-level detail.
3. Prioritize fixes for `critical` and `serious` issues. Address the markup, ARIA attributes, or keyboard interactions that triggered the violation. Where remediation is non-trivial, document the plan in an issue and link it from the pull request.
4. Once fixed, rerun both tools to confirm the regression is resolved before pushing.
5. If a false positive is encountered, prefer targeted rule configuration (for example, disable a specific axe rule) over broad ignores, and document the rationale in the spec or config file so future contributors understand the exception.

Keeping this loop tight ensures every page and featured window stays accessible as the portfolio evolves.
