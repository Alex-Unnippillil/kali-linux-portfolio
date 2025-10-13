export function abortableFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const promise = fetch(input, { ...init, signal: controller.signal });
  return {
    abort: () => controller.abort(),
    promise,
  };
}

export default abortableFetch;
