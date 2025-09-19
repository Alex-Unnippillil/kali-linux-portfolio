#!/usr/bin/env node
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const CERT_DIRECTORY = resolve(process.cwd(), '.certs');
const CERT_PATH = resolve(CERT_DIRECTORY, 'localhost.pem');
const KEY_PATH = resolve(CERT_DIRECTORY, 'localhost-key.pem');
const BUILD_ID_PATH = resolve(process.cwd(), '.next', 'BUILD_ID');

const require = createRequire(import.meta.url);
const nextBin = require.resolve('next/dist/bin/next');

function assertFileExists(path, label) {
  if (!existsSync(path)) {
    console.error(`[preview:https] Missing ${label} at ${path}.`);
    if (label === 'build output') {
      console.error('[preview:https] Run "yarn build" before starting the HTTPS preview server.');
    } else {
      console.error('[preview:https] Run "yarn certs:generate" to create mkcert certificates.');
    }
    process.exit(1);
  }
}

assertFileExists(CERT_PATH, 'certificate');
assertFileExists(KEY_PATH, 'private key');
assertFileExists(BUILD_ID_PATH, 'build output');

const httpHost = process.env.NEXT_HTTP_HOST || '127.0.0.1';
const httpPort = Number(process.env.NEXT_HTTP_PORT || 3000);
const httpsHost = process.env.HTTPS_HOST || process.env.HOST || 'localhost';
const httpsPort = Number(process.env.PORT || process.env.HTTPS_PORT || 3443);
const extraNextArgs = process.argv.slice(2);

const nextProcess = spawn(
  process.execPath,
  [
    nextBin,
    'start',
    '--hostname',
    httpHost,
    '--port',
    String(httpPort),
    ...extraNextArgs,
  ],
  {
    env: {
      ...process.env,
    },
    stdio: 'inherit',
  }
);

const agent = new http.Agent({ keepAlive: true });

function handleProxyRequest(req, res) {
  const proxyRequest = http.request(
    {
      hostname: httpHost,
      port: httpPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${httpHost}:${httpPort}`,
      },
      agent,
    },
    (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode ?? 500, proxyResponse.headers);
      proxyResponse.pipe(res);
    }
  );

  proxyRequest.on('error', (error) => {
    console.error('[preview:https] Proxy request failed:', error.message);
    if (!res.headersSent) {
      res.writeHead(502);
    }
    res.end('Proxy error');
  });

  req.pipe(proxyRequest);
}

function buildUpgradeRequest(req) {
  const headerLines = [];
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headerLines.push(`${key}: ${item}`);
      }
    } else if (typeof value !== 'undefined') {
      headerLines.push(`${key}: ${value}`);
    }
  }

  return (
    `GET ${req.url} HTTP/${req.httpVersion}\r\n` +
    headerLines.join('\r\n') +
    '\r\n\r\n'
  );
}

const httpsServer = https.createServer(
  {
    key: readFileSync(KEY_PATH),
    cert: readFileSync(CERT_PATH),
  },
  (req, res) => {
    handleProxyRequest(req, res);
  }
);

httpsServer.on('upgrade', (req, socket, head) => {
  const proxySocket = net.connect(httpPort, httpHost, () => {
    proxySocket.write(buildUpgradeRequest(req));
    if (head?.length) {
      proxySocket.write(head);
    }
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxySocket.on('error', (error) => {
    console.error('[preview:https] Proxy upgrade failed:', error.message);
    socket.destroy();
  });
});

let shuttingDown = false;

function closeHttpsServer(callback) {
  if (shuttingDown) {
    callback?.();
    return;
  }
  shuttingDown = true;
  httpsServer.close(callback);
}

httpsServer.on('error', (error) => {
  console.error('[preview:https] HTTPS server error:', error.message);
});

httpsServer.listen(httpsPort, httpsHost, () => {
  console.log(`[preview:https] Next.js running at http://${httpHost}:${httpPort}`);
  console.log(`[preview:https] HTTPS proxy available at https://${httpsHost}:${httpsPort}`);
  console.log('[preview:https] Press Ctrl+C to stop both processes.');
});

function shutdown(signal) {
  closeHttpsServer(() => {
    process.exit(0);
  });
  if (!nextProcess.killed) {
    nextProcess.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

nextProcess.on('exit', (code) => {
  closeHttpsServer(() => {
    process.exit(code ?? 0);
  });
});

nextProcess.on('error', (error) => {
  console.error('[preview:https] Failed to start Next.js production server:', error);
  closeHttpsServer(() => {
    process.exit(1);
  });
});
