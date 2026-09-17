const { TestEnvironment } = require('jest-environment-jsdom');
const { MessageChannel, MessagePort } = require('node:worker_threads');

/** Own native test polyfills at environment scope, including fully skipped suites.
 * React's scheduler can create ports during module evaluation before any test runs.
 * Closing them in afterAll misses suites with no runnable tests. */
module.exports = class PortfolioEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.channels = new Set();
    const channels = this.channels;
    this.global.MessagePort = MessagePort;
    this.global.MessageChannel = class extends MessageChannel {
      constructor() { super(); channels.add(this); }
    };
  }
  closeChannels() {
    for (const channel of this.channels || []) {
      channel.port1.close();
      channel.port2.close();
    }
    this.channels?.clear();
  }
  async teardown() {
    this.closeChannels();
    await super.teardown();
    this.closeChannels();
  }
};
