# Pull Request Review Checklist

Use this checklist to maintain quality and consistency in the repository. Reference it during code review and when preparing your own PR.

## Design
- [ ] Changes align with existing architecture and conventions.
- [ ] UI updates follow Tailwind and component standards.
- [ ] Feature flags or environment gates are added when introducing optional functionality.

## Tests
- [ ] Unit and integration tests cover new or changed behavior.
- [ ] `yarn test` passes locally; snapshots updated intentionally.
- [ ] Edge cases and error paths are exercised.

## Risk
- [ ] Security implications are considered; sensitive actions are sandboxed or simulated.
- [ ] Regressions are unlikely; critical flows have been manually verified.
- [ ] Rollback plan or mitigation steps are documented when necessary.

## Style
- [ ] Code passes `yarn lint` and follows project formatting.
- [ ] Naming, file structure, and imports mirror repository standards.
- [ ] Documentation and comments are updated alongside code.

## Migration
- [ ] Breaking changes or data migrations include clear upgrade steps.
- [ ] Config or dependency updates are noted in `CHANGELOG.md` when appropriate.
- [ ] Deprecations are communicated with timelines or alternatives.

---

### Citing Lines in Review Comments
Use GitHub's "Copy permalink" to link to specific lines, or reference files with line numbers like `path/to/file.ts:L10-L20`. Including exact locations helps reviewers understand and apply feedback quickly.

### Typical Pitfalls
- Forgetting to run `yarn lint` and `yarn test` before submitting.
- Neglecting documentation updates for new features.
- Overlooking environment variables or configuration required in production.

