import React from 'react';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';
import ErrorPane from './components/ErrorPane';

import { displayX } from './components/apps/x';
import { displaySpotify } from './components/apps/spotify';
import { displayVsCode } from './components/apps/vscode';
import { displaySettings } from './components/apps/settings';
import { displayChrome } from './components/apps/chrome';
import { displayTrash } from './components/apps/trash';
import { displayGedit } from './components/apps/gedit';
import { displayAboutAlex } from './components/apps/alex';
import { displayTodoist } from './components/apps/todoist';
import { displayYouTube } from './components/apps/youtube';
import { displayWeather } from './components/apps/weather';
import { displayConverter } from './components/apps/converter';
import { displayKeyConverter } from './components/apps/key-converter';
import { displayQrTool } from './components/apps/qr_tool';
import { displayTotp } from './components/apps/totp';
import { displayRegexRedactor } from './components/apps/regex-redactor';
import { displayRegexLab } from './components/apps/regex-lab';
import { displayAsciiArt } from './components/apps/ascii_art';
import { displayResourceMonitor } from './components/apps/resource_monitor';
import { displayQuoteGenerator } from './components/apps/quote_generator';
import { displayImportGraph } from './components/apps/import-graph';

import { displayCvssCalculator } from './components/apps/cvss-calculator';

import { displayProjectGallery } from './components/apps/project-gallery';
import { displayBaseEncoders } from './components/apps/base-encoders';

import { displayDgaDemo } from './components/apps/dga-demo';

import { displayEvidenceNotebook } from './components/apps/evidence-notebook';

import { displayExploitExplainer } from './components/apps/exploit-explainer';

import { displayMitreSelector } from './components/apps/mitre-selector';

import { displayFileSignature } from './components/apps/file-signature';

import { displayPlistInspector } from './components/apps/plist-inspector';

import { displaySpfFlattener } from './components/apps/spf-flattener';

import { displayHibpCheck } from './components/apps/hibp-check';

import { displayJwsJweWorkbench } from './apps/jws-jwe-workbench';

import { displayCaaChecker } from './components/apps/caa-checker';


export const THEME = process.env.NEXT_PUBLIC_THEME || 'Yaru';

const FALLBACK_THEME = 'Yaru';

const resolveAsset = (section, name) => {
  const themePath = `./themes/${THEME}/${section}/${name}`;
  const fallbackPath = `./themes/${FALLBACK_THEME}/${section}/${name}`;

  // Server side / build time check using fs
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.cwd(), 'public', 'themes', THEME, section, name);
      return fs.existsSync(fullPath) ? themePath : fallbackPath;
    } catch (_) {
      return fallbackPath;
    }
  }

  // Runtime check using Image error events
  if (typeof Image !== 'undefined') {
    const testImg = new Image();
    testImg.onerror = () => {
      document
        .querySelectorAll(`img[src='${themePath}']`)
        .forEach((el) => {
          el.src = fallbackPath;
        });
    };
    testImg.src = themePath;
  }

  return themePath;
};

export const icon = (name) => resolveAsset('apps', name);
export const sys = (name) => resolveAsset('system', name);

import createDynamicApp from './lib/createDynamicApp';

class DynamicAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    ReactGA.event('exception', {
      description: `Dynamic app render error: ${error.message}`,
      fatal: false,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPane
          code="render_error"
          message={`An error occurred while rendering ${this.props.name}.`}
        />
      );
    }

    return this.props.children;
  }
}

const createDisplay = (Component, name) => {
  const DisplayComponent = (addFolder, openApp) => (
    <DynamicAppErrorBoundary name={name}>
      <Component addFolder={addFolder} openApp={openApp} />
    </DynamicAppErrorBoundary>
  );
  DisplayComponent.displayName = Component.displayName || Component.name || 'Component';
  return DisplayComponent;
};

const dynamicAppEntries = [
  ['terminal', 'Terminal'],
  ['calc', 'Calc'],
  ['tictactoe', 'Tic Tac Toe'],
  ['chess', 'Chess'],
  ['connect-four', 'Connect Four'],
  ['hangman', 'Hangman'],
  ['frogger', 'Frogger'],
  ['flappy-bird', 'Flappy Bird'],
  ['2048', '2048'],
  ['snake', 'Snake'],
  ['memory', 'Memory'],
  ['minesweeper', 'Minesweeper'],
  ['pong', 'Pong'],
  ['pacman', 'Pacman'],
  ['car-racer', 'Car Racer'],
  ['platformer', 'Platformer'],
  ['battleship', 'Battleship'],
  ['checkers', 'Checkers'],
  ['reversi', 'Reversi'],
  ['simon', 'Simon'],
  ['sokoban', 'Sokoban'],
  ['solitaire', 'Solitaire'],
  ['tower-defense', 'Tower Defense'],
  ['word-search', 'Word Search'],
  ['wordle', 'Wordle'],
  ['blackjack', 'Blackjack'],
  ['breakout', 'Breakout'],
  ['asteroids', 'Asteroids'],
  ['sudoku', 'Sudoku'],
  ['space-invaders', 'Space Invaders'],
  ['nonogram', 'Nonogram'],
  ['tetris', 'Tetris'],
  ['candy-crush', 'Candy Crush'],
  ['match3', 'Match 3'],
  ['ct-search', 'CT Search'],
  ['mail-auth', 'Mail Auth'],
  ['mail-security-matrix', 'Mail Security Matrix'],
  ['dnssec-validator', 'DNSSEC Validator'],
  ['cve-dashboard', 'CVE Dashboard'],
  ['gomoku', 'Gomoku'],
  ['pinball', 'Pinball'],
  ['favicon-hash', 'Favicon Hash'],
  ['pcre-re2-lab', 'PCRE RE2 Lab'],
  ['pcap-viewer', 'PCAP Viewer'],
  ['sqlite-viewer', 'SQLite Viewer'],
  ['yara-tester', 'YARA Tester'],
  ['git-secrets-tester', 'Git Secrets Tester'],
  ['threat-modeler', 'Threat Modeler'],
  ['killchain-diagram', 'Killchain Diagram'],
  ['content-fingerprint', 'Content Fingerprint'],
  ['ssh-fingerprint', 'SSH Fingerprint'],
  ['nmap-viewer', 'Nmap Viewer'],
  ['report-viewer', 'Report Viewer'],
  ['jwks-fetcher', 'JWKS Fetcher'],
  ['license-classifier', 'License Classifier'],
  ['hsts-preload', 'HSTS Preload'],
  ['cookie-jar', 'Cookie Jar'],
  ['cookie-simulator', 'Cookie Simulator'],
  ['mixed-content', 'Mixed Content'],
  ['tls-explainer', 'TLS Explainer'],
  ['cache-policy', 'Cache Policy'],
  ['tor-exit-check', 'Tor Exit Check'],
  ['wayback-viewer', 'Wayback Viewer'],
  ['robots-auditor', 'Robots Auditor'],
  ['timeline-builder', 'Timeline Builder'],
  ['eml-msg-parser', 'EML/MSG Parser'],
  ['prefetch-jumplist', 'Prefetch JumpList'],
  ['ip-dns-leak', 'IP/DNS Leak'],
  ['ipv6-slaac', 'IPv6 SLAAC'],
  ['asn-explorer', 'ASN Explorer'],
  ['argon-bcrypt-demo', 'Argon/Bcrypt Demo'],
  ['pkce-helper', 'PKCE Helper'],
  ['csr-generator', 'CSR Generator'],
  ['open-redirect-lab', 'Open Redirect Lab'],
  ['samesite-lab', 'SameSite Lab'],
  ['csp-reporter', 'CSP Reporter'],
  ['sitemap-heatmap', 'Sitemap Heatmap'],
  ['meta-inspector', 'Meta Inspector'],
  ['redirect-visualizer', 'Redirect Visualizer'],
  ['http3-probe', 'HTTP/3 Probe'],
  ['sbom-viewer', 'SBOM Viewer'],
];

const dynamicScreens = Object.fromEntries(
  dynamicAppEntries.map(([id, name]) => [
    id,
    createDisplay(createDynamicApp(id, name), name),
  ])
);

const getScreen = (id) => dynamicScreens[id];

// Default window sizing for games to prevent oversized frames
const gameDefaults = {
  defaultWidth: 50,
  defaultHeight: 60,
};

const baseGame = {
  disabled: false,
  favourite: false,
  desktop_shortcut: false,
  ...gameDefaults,
};

export const games = [
  ['2048', '2048', { defaultWidth: 35, defaultHeight: 45 }],
  ['asteroids', 'Asteroids'],
  ['battleship', 'Battleship'],
  ['blackjack', 'Blackjack'],
  ['breakout', 'Breakout'],
  ['car-racer', 'Car Racer'],
  ['checkers', 'Checkers'],
  ['chess', 'Chess'],
  ['connect-four', 'Connect Four'],
  ['frogger', 'Frogger'],
  ['hangman', 'Hangman'],
  ['memory', 'Memory'],
  ['minesweeper', 'Minesweeper'],
  ['pacman', 'Pacman'],
  ['platformer', 'Platformer'],
  ['pong', 'Pong'],
  ['reversi', 'Reversi'],
  ['simon', 'Simon'],
  ['snake', 'Snake'],
  ['sokoban', 'Sokoban'],
  ['solitaire', 'Solitaire'],
  ['tictactoe', 'Tic Tac Toe'],
  ['tetris', 'Tetris'],
  ['tower-defense', 'Tower Defense'],
  ['word-search', 'Word Search'],
  ['wordle', 'Wordle'],
  ['nonogram', 'Nonogram'],
  ['space-invaders', 'Space Invaders'],
  ['sudoku', 'Sudoku'],
  ['flappy-bird', 'Flappy Bird'],
  ['candy-crush', 'Candy Crush'],
  ['match3', 'Match 3'],
  ['gomoku', 'Gomoku'],
  ['pinball', 'Pinball'],
].map(([id, title, extra = {}]) => ({
  ...baseGame,
  ...extra,
  id,
  title,
  icon: icon(`${id}.svg`),
  screen: getScreen(id),
}));
const apps = [
  {
    id: 'chrome',
    title: 'Firefox',
    icon: icon('kali-browser.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayChrome,
  },
  {
    id: 'calc',
    title: 'Calc',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('calc'),
    resizable: false,
    allowMaximize: false,
    defaultWidth: 25,
    defaultHeight: 40,
  },
  {
    id: 'terminal',
    title: 'Terminal',
    icon: icon('bash.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: getScreen('terminal'),
  },
  {
    id: 'vscode',
    title: 'Visual Studio Code',
    icon: icon('vscode.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayVsCode,
  },
  {
    id: 'x',
    title: 'X',
    icon: icon('x.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayX,
  },
  {
    id: 'spotify',
    title: 'Spotify',
    icon: icon('spotify.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySpotify,
  },
  {
    id: 'youtube',
    title: 'YouTube',
    icon: icon('youtube.svg'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displayYouTube,
  },
  {
    id: 'about-alex',
    title: 'About Alex',
    icon: sys('user-home.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: true,
    screen: displayAboutAlex,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: icon('gnome-control-center.png'),
    disabled: false,
    favourite: true,
    desktop_shortcut: false,
    screen: displaySettings,
  },
  {
    id: 'resource-monitor',
    title: 'Resource Monitor',
    icon: icon('resource-monitor.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayResourceMonitor,
  },
  {
    id: 'ip-dns-leak',
    title: 'IP/DNS Leak',
    icon: icon('ip-dns-leak.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('ip-dns-leak'),
  },
  {
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: icon('project-gallery.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: 'todoist',
    title: 'Todoist',
    icon: icon('todoist.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTodoist,
  },
  {
    id: 'trash',
    title: 'Trash',
    icon: sys('user-trash-full.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayTrash,
  },
  {
    id: 'gedit',
    title: 'Contact Me',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: true,
    screen: displayGedit,
  },
  {
    id: 'converter',
    title: 'Converter',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayConverter,
  },
  {
    id: 'key-converter',
    title: 'Key Converter',
    icon: icon('hash.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayKeyConverter,
  },
  {
    id: 'qr-tool',
    title: 'QR Tool',
    icon: icon('qr.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQrTool,
  },
  {
    id: 'totp',
    title: 'TOTP',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTotp,
  },
  {
    id: 'regex-redactor',
    title: 'Regex Redactor',
    icon: './themes/Yaru/apps/regex-redactor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRegexRedactor,
  },
  {
    id: 'regex-lab',
    title: 'Regex Lab',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayRegexLab,
  },
  {
    id: 'ascii-art',
    title: 'ASCII Art',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAsciiArt,
  },
  {
    id: 'license-classifier',
    title: 'License Classifier',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('license-classifier'),
  },
  {
    id: 'quote-generator',
    title: 'Quote Generator',
    icon: icon('quote.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayQuoteGenerator,
  },
  {
    id: 'cvss-calculator',
    title: 'CVSS Calculator',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCvssCalculator,
  },
  {
    id: 'caa-checker',
    title: 'CAA Checker',
    icon: icon('mail-auth.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayCaaChecker,
  },
  {
    id: 'jws-jwe-workbench',
    title: 'JWS/JWE Workbench',
    icon: icon('hash.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayJwsJweWorkbench,
  },
  {
    id: 'pkce-helper',
    title: 'PKCE Helper',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('pkce-helper'),
  },
  {
    id: 'timeline-builder',
    title: 'Timeline Builder',
    icon: icon('project-gallery.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('timeline-builder'),
  },
  {
    id: 'ct-search',
    title: 'CT Search',
    icon: icon('hash.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('ct-search'),
  },
  {
    id: 'evidence-notebook',
    title: 'Evidence Notebook',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayEvidenceNotebook,
  },
  {
    id: 'tls-explainer',
    title: 'TLS Explainer',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('tls-explainer'),
  },
  {
    id: 'import-graph',
    title: 'Import Graph',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayImportGraph,
  },
  {
    id: 'pcre-re2-lab',
    title: 'PCRE RE2 Lab',
    icon: './themes/Yaru/apps/regex-redactor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('pcre-re2-lab'),
  },
  {
    id: 'base-encoders',
    title: 'Base Encoders',
    icon: icon('hash.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayBaseEncoders,
  },
  {
    id: 'favicon-hash',
    title: 'Favicon Hash',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('favicon-hash'),
  },
  {
    id: 'cve-dashboard',
    title: 'CVE Dashboard',
    icon: './themes/Yaru/apps/calc.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('cve-dashboard'),
  },
  {
    id: 'pcap-viewer',
    title: 'PCAP Viewer',
    icon: './themes/Yaru/apps/pcap-viewer.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('pcap-viewer'),
  },
  {
    id: 'sqlite-viewer',
    title: 'SQLite Viewer',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('sqlite-viewer'),
  },
  {
    id: 'yara-tester',
    title: 'YARA Tester',
    icon: './themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('yara-tester'),
  },
  {
    id: 'dga-demo',
    title: 'DGA Demo',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayDgaDemo,
  },
  {
    id: 'git-secrets-tester',
    title: 'Git Secrets Tester',
    icon: './themes/Yaru/apps/git-secrets-tester.svg',
    disabled: false,
    favourite: false,
    screen: getScreen('git-secrets-tester'),
    desktop_shortcut: false,
  },
  {
    id: 'plist-inspector',
    title: 'Plist Inspector',
    icon: icon('gedit.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayPlistInspector,
  },
  {
    id: 'weather',
    title: 'Weather',
    icon: './themes/Yaru/apps/weather.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayWeather,
  },
  {
    id: 'cookie-jar',
    title: 'Cookie Jar',
    icon: './themes/Yaru/apps/cookie-jar.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('cookie-jar'),
  },
  {
    id: 'cookie-simulator',
    title: 'Cookie Simulator',
    icon: './themes/Yaru/apps/cookie-jar.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('cookie-simulator'),
  },
  {
    id: 'content-fingerprint',
    title: 'Content Fingerprint',
    icon: './themes/Yaru/apps/content-fingerprint.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('content-fingerprint'),
  },
  {
    id: 'nmap-viewer',
    title: 'Nmap Viewer',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('nmap-viewer'),
  },
  {
    id: 'report-viewer',
    title: 'Report Viewer',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('report-viewer'),
  },
  {
    id: 'prefetch-jumplist',
    title: 'Prefetch JumpList',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('prefetch-jumplist'),
  },
  {
    id: 'spf-flattener',
    title: 'SPF Flattener',
    icon: './themes/Yaru/apps/spf-flattener.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displaySpfFlattener,
  },
  {
    id: 'sitemap-heatmap',
    title: 'Sitemap Heatmap',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('sitemap-heatmap'),
  },
  {
    id: 'mail-auth',
    title: 'Mail Auth',
    icon: './themes/Yaru/apps/mail-auth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('mail-auth'),
  },
  {
    id: 'mail-security-matrix',
    title: 'Mail Security Matrix',
    icon: './themes/Yaru/apps/mail-auth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('mail-security-matrix'),
  },
  {
    id: 'threat-modeler',
    title: 'Threat Modeler',
    icon: './themes/Yaru/apps/threat-modeler.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('threat-modeler'),
  },
  {
    id: 'mixed-content',
    title: 'Mixed Content',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('mixed-content'),
  },
  {
    id: 'jwks-fetcher',
    title: 'JWKS Fetcher',
    icon: './themes/Yaru/apps/bash.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('jwks-fetcher'),
  },
  {
    id: 'sbom-viewer',
    title: 'SBOM Viewer',
    icon: './themes/Yaru/apps/gedit.png',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('sbom-viewer'),
  },
  {
    id: 'redirect-visualizer',
    title: 'Redirect Visualizer',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('redirect-visualizer'),
  },
  {
    id: 'http3-probe',
    title: 'HTTP/3 Probe',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('http3-probe'),
  },
  {
    id: 'csp-reporter',
    title: 'CSP Reporter',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('csp-reporter'),
  },
  {
    id: 'robots-auditor',
    title: 'Robots Auditor',
    icon: './themes/Yaru/apps/resource-monitor.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('robots-auditor'),
  },
  {
    id: 'eml-msg-parser',
    title: 'EML/MSG Parser',
    icon: './themes/Yaru/apps/mail-auth.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('eml-msg-parser'),
  },
  {
    id: 'ipv6-slaac',
    title: 'IPv6 SLAAC',
    icon: icon('calc.png'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('ipv6-slaac'),
  },
  {
    id: 'wayback-viewer',
    title: 'Wayback Viewer',
    icon: './themes/Yaru/apps/hash.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: getScreen('wayback-viewer'),
  },
];
 
export default apps;
