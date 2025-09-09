# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- Use explicit `@vercel/node` runtime version to satisfy Vercel build requirements.
- Define YouTube display function in app configuration to resolve missing reference errors.

## [2.1.0] - 2025-09-03
### Added
- Added safe copy script and integrated into build process.

### Fixed
- Handle missing chat ID in chat module.
- Pin Vercel runtime version to prevent deployment errors.
- Update runtime mocks to resolve test issues.

### Upgrading
- No notable behavior changes.

