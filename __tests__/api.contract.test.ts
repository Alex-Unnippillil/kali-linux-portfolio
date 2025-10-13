/**
 * @jest-environment node
 */

import { createServer, Server } from 'http';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'url';
import request, { type SuperTest, type Test } from 'supertest';

import quoteHandler, {
  QuoteErrorSchema,
  QuoteQuerySchema,
  QuoteResponseSchema,
  QuoteSchema,
} from '../pages/api/quote';
import modulesHandler, {
  ModuleErrorSchema,
  ModuleIndexResponseSchema,
} from '../pages/api/modules';
import { promises as fs } from 'fs';
import quotesData from '../public/quotes/quotes.json';

const allQuotes = QuoteSchema.array().parse(quotesData);
const tagForFilter = allQuotes.flatMap((quote) => quote.tags ?? [])[0];

function createApiTestServer(handler: NextApiHandler): Server {
  return createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '', true);
    const nextReq = Object.assign(req, {
      query: parsedUrl.query,
      cookies: {},
      env: process.env,
      preview: false,
      previewData: undefined,
      body: (req as NextApiRequest).body,
    }) as NextApiRequest;

    const nextRes = Object.assign(res, {
      status(statusCode: number) {
        res.statusCode = statusCode;
        return nextRes;
      },
      json(body: unknown) {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(body));
        return nextRes;
      },
    }) as NextApiResponse;

    try {
      const maybePromise = handler(nextReq, nextRes);

      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>).catch((error) => {
          res.statusCode = 500;
          res.end(error instanceof Error ? error.message : 'Unknown error');
        });
      }
    } catch (error) {
      res.statusCode = 500;
      res.end(error instanceof Error ? error.message : 'Unknown error');
    }
  });
}

async function withApiServer(
  handler: NextApiHandler,
  assertions: (api: SuperTest<Test>) => Promise<void>,
): Promise<void> {
  const server = createApiTestServer(handler);

  try {
    await assertions(request(server));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('API contracts', () => {
  describe('/api/quote', () => {
    it('returns a quote that matches the schema', async () => {
      await withApiServer(quoteHandler, async (api) => {
        const response = await api.get('/api/quote').expect(200);
        expect(() => QuoteSchema.parse(response.body)).not.toThrow();
      });
    });

    it('supports filtering by tag', async () => {
      expect(tagForFilter).toBeTruthy();

      if (!tagForFilter) {
        return;
      }

      await withApiServer(quoteHandler, async (api) => {
        const response = await api
          .get(`/api/quote?tag=${encodeURIComponent(tagForFilter)}`)
          .expect(200);
        const parsed = QuoteSchema.parse(response.body);

        if (parsed.tags) {
          expect(parsed.tags).toContain(tagForFilter);
        }
      });
    });

    it('validates response shape for missing tags', async () => {
      await withApiServer(quoteHandler, async (api) => {
        const response = await api.get('/api/quote?tag=__missing__').expect(404);
        expect(() => QuoteErrorSchema.parse(response.body)).not.toThrow();
      });
    });

    it('documents the request query contract', () => {
      expect(() => QuoteQuerySchema.parse({ tag: 'test' })).not.toThrow();
      expect(() => QuoteQuerySchema.parse({ tag: ['one', 'two'] })).not.toThrow();
    });
  });

  describe('/api/modules', () => {
    it('returns the module index that matches the schema', async () => {
      await withApiServer(modulesHandler, async (api) => {
        const response = await api.get('/api/modules').expect(200);
        expect(() => ModuleIndexResponseSchema.parse(response.body)).not.toThrow();
      });
    });

    it('returns an error payload when the index cannot be read', async () => {
      const readFileSpy = jest
        .spyOn(fs, 'readFile')
        .mockRejectedValueOnce(new Error('test failure'));

      await withApiServer(modulesHandler, async (api) => {
        const response = await api.get('/api/modules').expect(500);
        expect(() => ModuleErrorSchema.parse(response.body)).not.toThrow();
      });

      readFileSpy.mockRestore();
    });
  });

  it('exports schemas that describe every possible quote response', () => {
    expect(QuoteResponseSchema.safeParse({ error: 'oops' }).success).toBe(true);
    expect(
      QuoteResponseSchema.safeParse({
        content: 'Test',
        author: 'Tester',
      }).success,
    ).toBe(true);
  });
});
