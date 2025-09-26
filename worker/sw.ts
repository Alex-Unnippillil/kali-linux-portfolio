/// <reference lib="webworker" />

import { setCacheNameDetails } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? 'development';

const prefix = buildId ? `kali-linux-portfolio-${buildId}` : 'kali-linux-portfolio';

setCacheNameDetails({
  prefix,
  suffix: buildId,
});

export {};
