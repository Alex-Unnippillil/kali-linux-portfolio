export function abortableFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== 'true') {
    const controller = new AbortController();
    const promise = fetch(input, { ...init, signal: controller.signal });
    return {
      abort: () => controller.abort(),
      promise,
    };
  }

  return {
    abort: () => undefined,
    promise: Promise.resolve(new Response()),
  };
}

export default abortableFetch;
