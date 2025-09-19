interface Tweet {
  id: string;
  text: string;
  time: number;
}

interface ScheduleMessage {
  action: 'setQueue';
  tweets: Tweet[];
}

interface PublishResponse {
  action: 'publish';
  tweet: Tweet;
}

type Message = ScheduleMessage;

const timers: Record<string, number> = {};

self.onmessage = ({ data }: MessageEvent<Message>) => {
  if (data.action === 'setQueue') {
    // Clear existing timers
    Object.values(timers).forEach((id) => clearTimeout(id));
    for (const key in timers) delete timers[key];

    // Schedule new tweets
    data.tweets.forEach((t) => {
      const delay = t.time - Date.now();
      if (delay <= 0) {
        self.postMessage({ action: 'publish', tweet: t } as PublishResponse);
      } else {
        timers[t.id] = self.setTimeout(() => {
          self.postMessage({ action: 'publish', tweet: t } as PublishResponse);
          delete timers[t.id];
        }, delay);
      }
    });
  }
};

export {};
