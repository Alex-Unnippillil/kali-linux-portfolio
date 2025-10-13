/* eslint-env worker */
self.onmessage = (e) => {
  const { id, code } = e.data;
  const encoder = new TextEncoder();
  const hex = Array.from(encoder.encode(code))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
  postMessage({ id, hex });
};
