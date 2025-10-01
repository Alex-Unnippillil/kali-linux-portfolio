(function () {
  'use strict';

  const manifest =
    (typeof window !== 'undefined' && window.__EXTENSION_MANIFEST__) ||
    (typeof self !== 'undefined' && self.__EXTENSION_MANIFEST__) ||
    {};

  const commands = Array.isArray(manifest?.contributes?.commands)
    ? manifest.contributes.commands
    : [];
  const panels = Array.isArray(manifest?.contributes?.panels)
    ? manifest.contributes.panels
    : [];
  const settingsSchema = Array.isArray(manifest?.contributes?.settings)
    ? manifest.contributes.settings
    : [];
  const permissions = manifest?.permissions || {};

  const defaults = settingsSchema.reduce((acc, setting) => {
    if (setting && setting.id) {
      acc[setting.id] = setting.default;
    }
    return acc;
  }, {});

  const activeSettings = { ...defaults };

  const getHost = () => {
    if (typeof parent !== 'undefined' && parent !== window) return parent;
    if (typeof self !== 'undefined' && typeof self.postMessage === 'function') return self;
    return null;
  };

  const host = getHost();

  const sendLog = (payload) => {
    if (!host) return;
    try {
      if (typeof payload === 'string') {
        host.postMessage(payload, '*');
      } else {
        host.postMessage(payload, '*');
      }
    } catch (error) {
      console.error('Failed to post message', error);
    }
  };

  const panelMarkup = panels[0]?.html ||
    '<div class="hw-panel" data-root>\n' +
      '  <style>\n' +
      '    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b0e11; color: #f1f5f9; }\n' +
      '    .hw-panel { padding: 1.5rem; display: grid; gap: 0.75rem; }\n' +
      '    .hw-heading { font-size: 1.4rem; margin: 0; }\n' +
      '    .hw-description { margin: 0; opacity: 0.8; }\n' +
      '    .hw-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }\n' +
      '    .hw-actions button { background: #1793d1; color: #0b0e11; border: none; border-radius: 4px; padding: 0.5rem 0.75rem; cursor: pointer; font-weight: 600; }\n' +
      '    .hw-actions button:hover { background: #1aa0e4; }\n' +
      '    .hw-timestamp { margin: 0; font-family: "JetBrains Mono", "Fira Code", monospace; letter-spacing: 0.02em; }\n' +
      '    .hw-settings { background: rgba(15, 19, 23, 0.75); border-radius: 6px; padding: 0.75rem; font-size: 0.8rem; overflow: auto; }\n' +
      '  </style>\n' +
      '  <h1 class="hw-heading" data-greeting>Hello from Dev Mode!</h1>\n' +
      '  <p class="hw-description">This panel lives inside the extension sandbox. Use the buttons below to trigger commands.</p>\n' +
      '  <p class="hw-timestamp" data-timestamp></p>\n' +
      '  <div class="hw-actions">\n' +
      '    <button data-command="hello.sayHello">Run hello.sayHello</button>\n' +
      '    <button data-command="hello.toggleTimestamp">Toggle Timestamp</button>\n' +
      '  </div>\n' +
      '  <pre class="hw-settings" data-settings></pre>\n' +
      '</div>';

  let timestampTimer = null;

  const formatSettingsSummary = () => {
    try {
      return JSON.stringify(activeSettings, null, 2);
    } catch (error) {
      return String(error);
    }
  };

  const updateSettingsView = (root) => {
    const settingsBlock = root.querySelector('[data-settings]');
    if (settingsBlock) {
      settingsBlock.textContent = formatSettingsSummary();
    }
  };

  const updateTimestamp = (root) => {
    const node = root.querySelector('[data-timestamp]');
    if (!node) return;
    const enabled = Boolean(activeSettings['hello.showTimestamp']);
    if (!enabled) {
      node.style.display = 'none';
      node.textContent = '';
      return;
    }
    node.style.display = 'block';
    const now = new Date();
    node.textContent = `It is ${now.toLocaleTimeString()}.`;
  };

  const renderPanel = () => {
    document.body.innerHTML = panelMarkup;
    const root = document.querySelector('[data-root]') || document.body;

    const greetingNode = root.querySelector('[data-greeting]');
    if (greetingNode) {
      greetingNode.textContent = activeSettings['hello.greeting'] || 'Hello from Dev Mode!';
    }

    updateTimestamp(root);
    updateSettingsView(root);

    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const command = target.getAttribute('data-command');
      if (!command) return;
      event.preventDefault();
      runCommand(command, root);
    });

    if (timestampTimer) clearInterval(timestampTimer);
    timestampTimer = setInterval(() => updateTimestamp(root), 15000);
  };

  const runCommand = (command, root) => {
    switch (command) {
      case 'hello.sayHello': {
        const greeting = activeSettings['hello.greeting'] || 'Hello from Dev Mode!';
        sendLog(`hello.sayHello → ${greeting}`);
        break;
      }
      case 'hello.toggleTimestamp': {
        const current = Boolean(activeSettings['hello.showTimestamp']);
        const next = !current;
        activeSettings['hello.showTimestamp'] = next;
        updateTimestamp(root);
        updateSettingsView(root);
        sendLog(`hello.toggleTimestamp → ${next ? 'showing timestamp' : 'hiding timestamp'}`);
        break;
      }
      default: {
        sendLog(`Unknown command: ${command}`);
        break;
      }
    }
  };

  const handleRuntimeMessage = (event) => {
    const data = event?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'hello-world:updateSettings' && data.settings) {
      Object.assign(activeSettings, data.settings);
      renderPanel();
      sendLog('Settings updated from host message.');
    }
    if (data.type === 'hello-world:command' && data.command) {
      const root = document.querySelector('[data-root]') || document.body;
      runCommand(data.command, root);
    }
  };

  const announce = () => {
    const summary = {
      type: 'hello-world:ready',
      name: manifest?.name || manifest?.id || 'hello-world',
      version: manifest?.version || '0.0.0',
      commands: commands.map((cmd) => `${cmd.id} — ${cmd.description || cmd.title || ''}`),
      settings: settingsSchema.map((setting) => {
        const value = activeSettings[setting.id];
        return `${setting.id} = ${typeof value === 'string' ? `"${value}"` : value}`;
      }),
      permissions: permissions,
    };
    sendLog(summary);
    sendLog('Hello World extension loaded. Use the buttons in the panel to trigger commands.');
  };

  const init = () => {
    renderPanel();
    announce();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleRuntimeMessage);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  } else if (typeof self !== 'undefined') {
    self.addEventListener('message', handleRuntimeMessage);
    init();
  }
})();
