export class ImageResponse extends Response {
  constructor(_element: unknown, init: ResponseInit & { width?: number; height?: number } = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type') && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'image/png');
    }
    const body = new Uint8Array(2048).fill(1);
    super(body, { ...init, headers });
  }
}
