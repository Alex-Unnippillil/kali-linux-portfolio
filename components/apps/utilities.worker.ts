self.onmessage = (e: MessageEvent<number>) => {
  const n = e.data;
  // simple demo: square the number
  // @ts-ignore
  self.postMessage(n * n);
};
