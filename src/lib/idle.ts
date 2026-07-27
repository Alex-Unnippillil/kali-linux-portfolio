const q: Array<() => void> = [];

let scheduled = false;

const fallbackTimeRemaining = (budget = 50) => {
  const start = Date.now();

  return () => Math.max(0, budget - (Date.now() - start));
};

const requestIdle = (callback: IdleRequestCallback) => {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback);
    return;
  }

  setTimeout(() => {
    const timeRemaining = fallbackTimeRemaining();
    callback({
      didTimeout: false,
      timeRemaining,
    } as IdleDeadline);
  }, 1);
};

const processQueue: IdleRequestCallback = (deadline) => {
  scheduled = false;

  while (q.length > 0 && deadline.timeRemaining() > 0) {
    const job = q.shift();

    if (!job) {
      break;
    }

    job();
  }

  if (q.length > 0) {
    schedule();
  }
};

const schedule = () => {
  if (scheduled || q.length === 0) {
    return;
  }

  scheduled = true;
  requestIdle(processQueue);
};

export const enqueue = (job: () => void) => {
  q.push(job);
  schedule();
};
