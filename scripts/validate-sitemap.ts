import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { XMLParser } from 'fast-xml-parser';

const PORT = Number(process.env.PORT) || 3000;

function startServer(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const filePath = path.join(
      'public',
      req.url ? req.url.replace(/^\//, '') : 'index.html'
    );
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    res.statusCode = 200;
    res.setHeader('Content-Encoding', 'gzip');
    fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  const server = await startServer();
  try {
    const sitemapRes = await fetch(`http://localhost:${PORT}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    new XMLParser().parse(sitemapText);

    const robotsRes = await fetch(`http://localhost:${PORT}/robots.txt`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    if (robotsRes.status !== 200) {
      throw new Error(`robots.txt returned status ${robotsRes.status}`);
    }
    const encoding = robotsRes.headers.get('content-encoding');
    if (!encoding || !encoding.includes('gzip')) {
      throw new Error('robots.txt is not gzip encoded');
    }
    console.log('Sitemap and robots.txt validation passed');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
