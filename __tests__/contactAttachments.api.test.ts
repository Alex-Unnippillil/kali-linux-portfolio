import handler, { MAX_TOTAL_ATTACHMENT_SIZE } from '../pages/api/contact/attachments';
import http from 'http';
import request from 'supertest';

describe('contact attachments api', () => {
  const createServer = () =>
    http.createServer((req, res) => {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };
      handler(req, res);
    });

  it('accepts file uploads', async () => {
    const server = createServer();
    const res = await request(server)
      .post('/api/contact/attachments')
      .attach('files', Buffer.from('hello'), 'hello.txt');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('rejects when total size exceeds limit', async () => {
    const server = createServer();
    const big = Buffer.alloc(MAX_TOTAL_ATTACHMENT_SIZE + 1);
    const res = await request(server)
      .post('/api/contact/attachments')
      .attach('files', big, 'big.bin');
    expect(res.status).toBe(413);
  });
});
