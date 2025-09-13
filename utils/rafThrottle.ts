export default function rafThrottle<T extends (...args: any[]) => void>(fn: T) {
  let frame: number | null = null;
  const wrapper = (...args: Parameters<T>) => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = null;
      fn(...args);
    });
  };
  wrapper.cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
  return wrapper as T & { cancel: () => void };
}
