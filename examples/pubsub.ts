import { publish, subscribe } from '@/utils/pubsub';

type Message = {
  status: string;
  detail?: string;
};

export function runPubSubExample(): Message[] {
  const received: Message[] = [];
  const unsubscribe = subscribe('examples:pubsub', (payload) => {
    received.push(payload as Message);
  });

  publish('examples:pubsub', { status: 'connected' });
  publish('examples:pubsub', { status: 'processing', detail: 'step-1' });

  unsubscribe();

  publish('examples:pubsub', { status: 'ignored', detail: 'after-unsubscribe' });

  return received;
}
