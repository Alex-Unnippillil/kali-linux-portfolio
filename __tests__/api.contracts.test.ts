/** @jest-environment node */

import { createMocks } from 'node-mocks-http';
import type { ModuleMetadata, ModuleOption } from '../modules/metadata';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@supabase/supabase-js';

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  delete (global as any).fetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('API contract coverage', () => {
  test('module update endpoint preserves version contract', async () => {
    const { default: handler } = await import('../pages/api/modules/update');
    const { req, res } = createMocks({
      method: 'GET',
      query: { version: '1.0.0' },
    });

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '2.0.0' }),
    });
    (global as any).fetch = fetchMock;

    await handler(req as any, res as any);

    expect(fetchMock).toHaveBeenCalled();
    expect(res._getStatusCode()).toBe(200);

    const data = res._getJSONData();
    expect(Object.keys(data).sort()).toEqual(['current', 'latest', 'needsUpdate']);
    expect(data).toEqual({ current: '1.0.0', latest: '2.0.0', needsUpdate: true });
  });

  test('plugins catalog endpoint returns stable descriptors', async () => {
    const { default: handler } = await import('../pages/api/plugins/index');
    const { req, res } = createMocks({ method: 'GET' });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);

    const data = res._getJSONData();
    expect(Array.isArray(data)).toBe(true);
    data.forEach((plugin: any) => {
      expect(Object.keys(plugin).sort()).toEqual(['file', 'id']);
      expect(typeof plugin.id).toBe('string');
      expect(typeof plugin.file).toBe('string');
      expect(plugin.file).toBe(`${plugin.id}.json`);
    });
  });

  test('module metadata DTOs expose required fields', async () => {
    const metadataModule = await import('../modules/metadata');
    const modules = metadataModule.default as ModuleMetadata[];

    expect(Array.isArray(modules)).toBe(true);
    modules.forEach((module: ModuleMetadata) => {
      expect(Object.keys(module).sort()).toEqual([
        'description',
        'name',
        'options',
        'tags',
      ]);
      expect(typeof module.name).toBe('string');
      expect(typeof module.description).toBe('string');
      expect(Array.isArray(module.tags)).toBe(true);
      module.tags.forEach((tag: unknown) => {
        expect(typeof tag).toBe('string');
      });
      expect(Array.isArray(module.options)).toBe(true);
      module.options.forEach((option: ModuleOption) => {
        expect(Object.keys(option).sort()).toEqual([
          'description',
          'name',
          'required',
        ]);
        expect(typeof option.name).toBe('string');
        expect(typeof option.description).toBe('string');
        expect(typeof option.required).toBe('boolean');
      });
    });
  });

  test('leaderboard top endpoint maintains response contract', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

    const limitMock = jest.fn().mockResolvedValue({
      data: [{ username: 'player1', score: 123, game: '2048' }],
      error: null,
    });

    createClientMock.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      }),
    } as any);

    const { default: handler } = await import('../pages/api/leaderboard/top');
    const { req, res } = createMocks({
      method: 'GET',
      query: { game: '2048', limit: '5' },
    });

    await handler(req as any, res as any);

    expect(limitMock).toHaveBeenCalledWith(5);
    expect(res._getStatusCode()).toBe(200);

    const data = res._getJSONData();
    expect(Array.isArray(data)).toBe(true);
    data.forEach((entry: any) => {
      expect(Object.keys(entry).sort()).toEqual(['game', 'score', 'username']);
      expect(typeof entry.username).toBe('string');
      expect(typeof entry.game).toBe('string');
      expect(typeof entry.score).toBe('number');
    });
  });

  test('leaderboard submit endpoint validates payload contract', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';

    const insertMock = jest.fn().mockResolvedValue({ error: null });

    createClientMock.mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: insertMock,
      }),
    } as any);

    const { default: handler } = await import('../pages/api/leaderboard/submit');
    const { req, res } = createMocks({
      method: 'POST',
      body: { game: '2048', username: 'Player', score: 999 },
    });

    await handler(req as any, res as any);

    expect(insertMock).toHaveBeenCalledWith({
      game: '2048',
      username: 'Player',
      score: 999,
    });

    expect(res._getStatusCode()).toBe(200);

    const data = res._getJSONData();
    expect(Object.keys(data).sort()).toEqual(['success']);
    expect(data.success).toBe(true);
  });
});
