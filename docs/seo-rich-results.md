# Rich Results validation guide

Use this checklist whenever structured data changes. It covers local verification and Google Rich Results testing so reviewers can confirm the Portfolio and SoftwareApplication schemas continue to parse.

## 1. Run schema unit tests

1. Install dependencies if needed: `yarn install`.
2. Execute the targeted test suite: `yarn test schema`.
   - The test suite covers the Person, Portfolio, and SoftwareApplication payloads produced in `components/SEO/Meta.tsx` and verifies that project and module data flow into JSON-LD.

## 2. Inspect structured data locally

1. Start the development server with `yarn dev`.
2. Load `http://localhost:3000` in a browser.
3. Open the page source and copy the JSON-LD blocks injected by `<SEO/Meta>`.
   - You can also capture the markup with `curl -s http://localhost:3000 | pbcopy` (macOS) or redirect it to a file for review.

## 3. Validate with Google Rich Results Test

1. Navigate to [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results).
2. Choose the **Code** tab, paste the copied JSON-LD payloads, and run the test.
3. Confirm the tool reports the Person, Portfolio, and SoftwareApplication entities without errors or warnings.
4. Repeat for any secondary pages that override `<SEO/Meta>` if you add them in the future.

## 4. Share results

- Attach a screenshot or exported report from the Rich Results Test to the pull request when changing structured data.
- Note any warnings that cannot be resolved (for example, optional fields you intentionally omit) so reviewers understand the trade-offs.

Following these steps keeps the structured data verifiable and documents the manual validation workflow for contributors.
