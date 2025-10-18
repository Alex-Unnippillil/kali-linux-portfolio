# API Contract Testing Guide

This project uses **Zod** schemas and Jest contract tests to guarantee that our
Next.js API routes keep a stable request/response shape. Follow the steps below
when you add or modify any endpoint.

## 1. Define schemas in the API route

Every TypeScript file under `pages/api/` must export the schemas that describe
its contract:

1. Import `z` from `zod`.
2. Declare `Request` schemas for query parameters and/or body fields.
3. Declare `Response` schemas for all success and error payloads.
4. Use the schemas inside the handler to parse inbound data and to validate the
   outgoing payload before calling `res.json()`.
5. Export each schema (e.g., `export const QuoteSchema = …`).

These exports allow the Jest suite to reuse the exact same definitions the API
relies on.

## 2. Extend the contract tests

Contract tests live in `__tests__/api.contract.test.ts` and run in a Node test
environment using `supertest`.

1. Import the handler and the schemas you exported from the new API route.
2. Use `withApiServer(handler, assertions)` to exercise the endpoint via HTTP.
3. Validate every response with the appropriate Zod schema using
   `Schema.parse(response.body)` or `Schema.safeParse()`.
4. Add negative-path coverage where possible (e.g., I/O failures, validation
   errors) so schema drift breaks the test suite immediately.

## 3. Run the test suite

After updating an endpoint or contract tests, make sure

```bash
yarn test
```

completes successfully. The CI workflow also runs `yarn test`, so any schema
drift that slips into a route will fail the pipeline.

## 4. Checklist for new endpoints

- [ ] Zod schemas exported from the API route.
- [ ] Handler validates inputs and outputs with those schemas.
- [ ] Contract tests cover success and error responses via `supertest`.
- [ ] `yarn test` passes locally.
