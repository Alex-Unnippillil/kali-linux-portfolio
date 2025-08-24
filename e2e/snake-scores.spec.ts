import { test, expect } from '@playwright/test';

test('snake scores api works', async ({ request }) => {
  const post = await request.post('/api/snake/scores', {
    data: { score: 7 },
  });
  expect(post.ok()).toBeTruthy();
  const postJson = await post.json();
  expect(Array.isArray(postJson.scores)).toBe(true);

  const get = await request.get('/api/snake/scores');
  expect(get.ok()).toBeTruthy();
  const getJson = await get.json();
  expect(getJson.scores[0]).toBe(7);
});
