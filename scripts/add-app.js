const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const toPascal = (str) =>
  str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

const injectApp = (configPath, id, title) => {
  let content = fs.readFileSync(configPath, 'utf8');

  const dynamicRegex = /(const dynamicAppEntries = \[[^]*?)(\n\];)/;
  const dynamicEntry = `  ['${id}', '${title}'],\n`;
  if (dynamicRegex.test(content)) {
    content = content.replace(dynamicRegex, `$1${dynamicEntry}$2`);
  } else {
    throw new Error('dynamicAppEntries not found');
  }

  const appsRegex = /(const apps = \[[^]*?)(\n\];)/;
  const appsEntry = `  {\n    id: '${id}',\n    title: '${title}',\n    icon: icon('${id}.svg'),\n    disabled: false,\n    favourite: false,\n    desktop_shortcut: false,\n    screen: getScreen('${id}'),\n  },\n`;
  if (appsRegex.test(content)) {
    content = content.replace(appsRegex, `$1${appsEntry}$2`);
  } else {
    throw new Error('apps array not found');
  }

  fs.writeFileSync(configPath, content);
};

const scaffoldComponent = (componentsDir, id, title) => {
  if (!fs.existsSync(componentsDir))
    fs.mkdirSync(componentsDir, { recursive: true });
  const pascal = toPascal(id);
  const file = path.join(componentsDir, `${id}.tsx`);
  const component = `import React from 'react';\n\nconst ${pascal} = () => (\n  <div data-testid='${id}-app'>New app: ${title}</div>\n);\n\nexport const display${pascal} = () => <${pascal} />;\n\nexport default display${pascal};\n`;
  fs.writeFileSync(file, component);
};

const createIcon = (iconDir, id) => {
  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });
  const iconPath = path.join(iconDir, `${id}.svg`);
  if (!fs.existsSync(iconPath)) {
    fs.writeFileSync(
      iconPath,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>\n'
    );
  }
};

const runValidateIcons = (spawn = child_process.spawnSync) => {
  spawn('yarn', ['validate:icons'], { stdio: 'inherit' });
};

const addApp = (
  id,
  title,
  root = path.join(__dirname, '..'),
  spawn = child_process.spawnSync
) => {
  const configPath = path.join(root, 'apps.config.js');
  const componentsDir = path.join(root, 'components', 'apps');
  const iconDir = path.join(root, 'public', 'themes', 'Yaru', 'apps');
  injectApp(configPath, id, title);
  scaffoldComponent(componentsDir, id, title);
  createIcon(iconDir, id);
  runValidateIcons(spawn);
};

if (require.main === module) {
  const [id, ...rest] = process.argv.slice(2);
  const title = rest.join(' ');
  if (!id || !title) {
    console.error('Usage: node scripts/add-app.js <id> "App Title"');
    process.exit(1);
  }
  addApp(id, title);
}

module.exports = {
  addApp,
  injectApp,
  scaffoldComponent,
  createIcon,
  runValidateIcons,
  toPascal,
};
