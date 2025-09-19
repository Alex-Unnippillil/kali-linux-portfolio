# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Upgraded `wait-on` to v9.0.0 so the transitive `axios` dependency pulls in the DoS fix from 1.12.1 (GHSA-4hjh-wcwx-xvwj).
- Forced `path-to-regexp` v6.3.0 via Yarn resolutions to mitigate the regex backtracking issue reported for `@vercel/microfrontends` (GHSA-9wv6-86v2-598j).

## [2.1.0] - 2025-09-03
### Added
- Added safe copy script and integrated into build process.

### Fixed
- Handle missing chat ID in chat module.
- Pin Vercel runtime version to prevent deployment errors.
- Update runtime mocks to resolve test issues.

### Upgrading
- No notable behavior changes.

