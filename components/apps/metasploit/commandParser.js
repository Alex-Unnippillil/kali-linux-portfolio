const formatOptions = (options = {}, overrides = {}) => {
  const entries = Object.entries(options);
  if (!entries.length) {
    return 'No configurable options for this module.';
  }
  return entries
    .map(([key, meta]) => {
      const current =
        overrides[key] !== undefined ? overrides[key] : meta.default ?? '';
      const required = meta.required ? ' (required)' : '';
      return `${key} => ${current} ${required} - ${meta.desc}`;
    })
    .join('\n');
};

const formatModuleInfo = (module) => {
  const lines = [
    `Name: ${module.name}`,
    `Type: ${module.type}`,
    module.platform ? `Platform: ${module.platform}` : null,
    module.disclosure_date ? `Disclosure: ${module.disclosure_date}` : null,
    module.cve?.length ? `CVE: ${module.cve.join(', ')}` : null,
    module.doc ? `Docs: ${module.doc}` : null,
    module.teaches ? `Lesson: ${module.teaches}` : null,
    '',
    module.description?.trim() || 'No description available.',
  ].filter(Boolean);
  return lines.join('\n');
};

const formatHelp = () => `Available demo commands:
  help, ?
  search <term> [type:auxiliary|exploit|post]
  use <module>
  info
  show options
  set <option> <value>
  run | exploit
  back`;

export const defaultMetasploitState = {
  activeModule: null,
  options: {},
};

export const parseMetasploitCommand = (
  command,
  modules,
  state = defaultMetasploitState
) => {
  const trimmed = command.trim();
  if (!trimmed) {
    return { output: '', nextState: state };
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'help' || lower === '?') {
    return { output: formatHelp(), nextState: state };
  }

  if (lower.startsWith('search')) {
    const query = trimmed.slice(6).trim();
    if (!query) {
      return {
        output: 'Usage: search <term> [type:auxiliary|exploit|post]',
        nextState: state,
      };
    }
    const typeMatch = query.match(/type:([a-z]+)/i);
    const typeFilter = typeMatch ? typeMatch[1].toLowerCase() : null;
    const cleaned = query.replace(/type:[a-z]+/gi, '').trim();
    const terms = cleaned.split(/\s+/).filter(Boolean);
    const matches = modules.filter((module) => {
      if (typeFilter && module.type !== typeFilter) return false;
      if (!terms.length) return true;
      const haystack = [
        module.name,
        module.description,
        ...(module.tags || []),
        ...(module.cve || []),
      ]
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term.toLowerCase()));
    });
    if (!matches.length) {
      return { output: 'No modules found for that search.', nextState: state };
    }
    const list = matches
      .slice(0, 6)
      .map((module) => `- ${module.name} (${module.type})`)
      .join('\n');
    const more = matches.length > 6 ? '\n...more results hidden' : '';
    return {
      output: `Matching modules:\n${list}${more}`,
      nextState: state,
    };
  }

  if (lower.startsWith('use ')) {
    const moduleName = trimmed.slice(4).trim();
    const module = modules.find((m) => m.name === moduleName);
    if (!module) {
      return {
        output: `Unknown module: ${moduleName}`,
        nextState: state,
      };
    }
    return {
      output: `Module selected: ${module.name}\n${formatOptions(module.options)}`,
      nextState: { ...state, activeModule: module, options: {} },
    };
  }

  if (lower === 'info' || lower === 'show info') {
    if (!state.activeModule) {
      return {
        output: 'No module selected. Use `use <module>` first.',
        nextState: state,
      };
    }
    return { output: formatModuleInfo(state.activeModule), nextState: state };
  }

  if (lower === 'show options') {
    if (!state.activeModule) {
      return {
        output: 'No module selected. Use `use <module>` first.',
        nextState: state,
      };
    }
    return {
      output: formatOptions(state.activeModule.options, state.options),
      nextState: state,
    };
  }

  if (lower.startsWith('set ')) {
    const [, key, ...rest] = trimmed.split(' ');
    if (!key || rest.length === 0) {
      return {
        output: 'Usage: set <option> <value>',
        nextState: state,
      };
    }
    const value = rest.join(' ');
    return {
      output: `${key} => ${value}`,
      nextState: {
        ...state,
        options: { ...state.options, [key]: value },
      },
    };
  }

  if (lower === 'run' || lower === 'exploit') {
    if (!state.activeModule) {
      return {
        output: 'No module selected. Use `use <module>` first.',
        nextState: state,
      };
    }
    return {
      output: `[*] Running ${state.activeModule.name} in demo mode...\n${
        state.activeModule.transcript || '[*] Demo output complete.'
      }`,
      nextState: state,
    };
  }

  if (lower === 'back') {
    return { output: 'Returning to msfconsole.', nextState: defaultMetasploitState };
  }

  if (lower.startsWith('sessions')) {
    return {
      output:
        'Active sessions are listed in the left panel in this demo. Use the UI to explore.',
      nextState: state,
    };
  }

  return {
    output: `Unknown command: ${trimmed}\n${formatHelp()}`,
    nextState: state,
  };
};
