let cancelled = false;

function heavySum(n: number) {
  let total = 0;
  for (let i = 0; i <= n; i++) {
    total += i;
    if (i % 10000 === 0) {
      // @ts-ignore
      self.postMessage({ progress: i / n });
      if (cancelled) return null;
    }
  }
  return total;
}

self.onmessage = (e: MessageEvent<any>) => {
  const data = e.data;
  if (data && data.type === 'cancel') {
    cancelled = true;
    return;
  }
  cancelled = false;
  const result = heavySum(data.n ?? 0);
  if (result !== null) {
    // @ts-ignore
    self.postMessage({ result });
  }
};

