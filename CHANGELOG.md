# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Removed unused runtime packages such as Supabase SSR helpers, Ant Design, A-Frame, and other legacy UI/game libraries to slim the bundle.
- Dropped unused type packages and build helpers while teaching depcheck about the remaining PostCSS and WICG File System Access integrations.
- Added explicit dev dependencies for Playwright, JSDOM, and `@jest/globals` so smoke tests and Jest suites install the binaries they require.

## [2.1.0] - 2025-09-03
### Added
- Added safe copy script and integrated into build process.

### Fixed
- Handle missing chat ID in chat module.
- Pin Vercel runtime version to prevent deployment errors.
- Update runtime mocks to resolve test issues.

### Upgrading
- No notable behavior changes.

