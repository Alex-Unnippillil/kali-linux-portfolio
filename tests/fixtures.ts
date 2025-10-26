import { test as base, expect } from '@playwright/test';
import type { ConsoleMessage } from '@playwright/test';

type ConsoleMessageType = 'warning' | 'error';

export type ConsoleMessageExpectationOptions = {
  type: ConsoleMessageType;
  message?: string;
  regex?: RegExp;
  description?: string;
  optional?: boolean;
};

type ConsoleMessageExpectation = {
  type: ConsoleMessageType;
  matcher: (text: string) => boolean;
  description: string;
  seen: boolean;
  optional: boolean;
};

type ConsoleMessageLocation = ReturnType<ConsoleMessage['location']>;

type ObservedConsoleMessage = {
  type: ConsoleMessageType;
  text: string;
  location: ConsoleMessageLocation;
};

type Fixtures = {
  expectConsoleMessage: (options: ConsoleMessageExpectationOptions) => void;
  consoleMessageExpectations: ConsoleMessageExpectation[];
};

const normalizeOptions = (options: ConsoleMessageExpectationOptions): ConsoleMessageExpectation => {
  const { type, message, regex, description, optional = false } = options;
  if (!type) {
    throw new Error('expectConsoleMessage requires a message type.');
  }

  const hasMessage = typeof message === 'string';
  const hasRegex = regex instanceof RegExp;
  if (Number(hasMessage) + Number(hasRegex) !== 1) {
    throw new Error('expectConsoleMessage requires exactly one of `message` or `regex`.');
  }

  if (hasMessage) {
    const text = message ?? '';
    return {
      type,
      matcher: (value) => value === text,
      description: description ?? text,
      seen: false,
      optional,
    };
  }

  const expression = regex!;
  return {
    type,
    matcher: (value) => expression.test(value),
    description: description ?? expression.toString(),
    seen: false,
    optional,
  };
};

export const test = base.extend<Fixtures>({
  consoleMessageExpectations: async ({}, applyFixture) => {
    const expectations: ConsoleMessageExpectation[] = [];
    await applyFixture(expectations);
  },
  expectConsoleMessage: async ({ consoleMessageExpectations }, applyFixture) => {
    await applyFixture((options: ConsoleMessageExpectationOptions) => {
      consoleMessageExpectations.push(normalizeOptions(options));
    });
  },
  page: async ({ page }, applyFixture, _testInfo, consoleMessageExpectations) => {
    const observed: ObservedConsoleMessage[] = [];
    const handler = (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type !== 'warning' && type !== 'error') {
        return;
      }

      observed.push({
        type,
        text: msg.text(),
        location: msg.location(),
      });
    };

    page.on('console', handler);

    try {
      await applyFixture(page);
    } finally {
      page.off('console', handler);
    }

    const unexpectedMessages: ObservedConsoleMessage[] = [];
    for (const message of observed) {
      const expectation = consoleMessageExpectations.find(
        (candidate) => !candidate.seen && candidate.type === message.type && candidate.matcher(message.text),
      );
      if (expectation) {
        expectation.seen = true;
      } else {
        unexpectedMessages.push(message);
      }
    }

    if (unexpectedMessages.length > 0) {
      const failures = unexpectedMessages.map((message) => {
        const location = message.location;
        const locationParts: string[] = [];
        if (location?.url) {
          locationParts.push(location.url);
          if (typeof location.lineNumber === 'number') {
            const line = location.lineNumber;
            const column = location.columnNumber ?? 0;
            locationParts.push(`${line}:${column}`);
          }
        }
        const locationLabel = locationParts.length > 0 ? ` at ${locationParts.join(':')}` : '';
        return `[${message.type}] ${message.text}${locationLabel}`;
      });

      throw new Error(
        `Console warnings or errors detected.\n${failures.map((entry) => ` - ${entry}`).join('\n')}`,
      );
    }

    const missed = consoleMessageExpectations.filter((entry) => !entry.seen && !entry.optional);
    if (missed.length > 0) {
      throw new Error(
        `Expected console messages were not observed:\n${missed
          .map((entry) => ` - [${entry.type}] ${entry.description}`)
          .join('\n')}`,
      );
    }
  },
});

export { expect } from '@playwright/test';
