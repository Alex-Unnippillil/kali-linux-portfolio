declare module '@chromatic-com/playwright' {
  import type { Page } from '@playwright/test';

  export function chromaticSnapshot(page: Page, options: { name: string }): Promise<void>;
}
