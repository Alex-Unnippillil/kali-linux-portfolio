// @jest-environment node
import handler from '../pages/api/docs-search';
class MockResponse {
  constructor(public body: string, public init: any) {}
  async json() {
    return JSON.parse(this.body);
  }
}

global.Response = MockResponse as any;

it('returns results for query', async () => {
  const req = { url: 'http://localhost/api/docs-search?q=keyboard' } as any;
  const res = await handler(req);
  const data = await res.json();
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);
});
