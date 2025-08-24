# App Router Migration Steps

This guide explains how to move entries from the legacy `pages/` directory into the `app/` directory while preserving layouts.

## Steps

1. **Create a route group**
   - Under `app/`, add a directory like `(desktop)` and include a `layout.tsx` that mirrors the behaviour of `_app.tsx`.
2. **Mirror the path structure**
   - For each file in `pages/`, create a matching folder inside `app/(desktop)` and add a `page.tsx`.
3. **Transfer component code**
   - Move the React component from the old `pages` file into the new `page.tsx`.
4. **Update data fetching**
   - Convert `getStaticProps`/`getServerSideProps` to `fetch` requests or server components.
5. **Remove legacy wrappers**
   - Delete usage of `_app.tsx` or custom documents once all routes use the App Router.
6. **Test the migration**
   - Run `yarn lint`, `yarn typecheck`, and `yarn test` to ensure the new route works.

Following these steps allows a gradual migration to the App Router while keeping equivalent layouts.
