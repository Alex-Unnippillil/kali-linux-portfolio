import React from 'react';
import dynamic from 'next/dynamic';
import ReactGA from 'react-ga4';

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
import { displayQrTool } from './components/apps/qr_tool';
import { displayAsciiArt } from './components/apps/ascii_art';
import { displayQuoteGenerator } from './components/apps/quote_generator';
import { displayShowcase } from './components/apps/showcase';
import { displayProjectGallery } from './components/apps/project-gallery';

const createDynamicApp = (path, name) =>
  dynamic(
    () =>
      import(`./components/apps/${path}`).then((mod) => {
        ReactGA.event({ category: 'Application', action: `Loaded ${name}` });
        return mod.default;
      }),
    {
      ssr: false,
      loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey text-white">
          {`Loading ${name}...`}
        </div>
      ),
    }
  );

const createDisplay = (Component) => (addFolder, openApp) => (
  <Component addFolder={addFolder} openApp={openApp} />
);

const TerminalApp = createDynamicApp('terminal', 'Terminal');
const CalcApp = createDynamicApp('calc', 'Calc');
const TicTacToeApp = createDynamicApp('tictactoe', 'Tic Tac Toe');

const displayTerminal = createDisplay(TerminalApp);
const displayCalc = createDisplay(CalcApp);
const displayTicTacToe = createDisplay(TicTacToeApp);

export const games = [
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    icon: './themes/Yaru/apps/gnome-tetravex.svg',
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayTicTacToe,
  },
];

const apps = [
  { id: 'x', title: 'X', icon: './themes/Yaru/apps/x.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayX },
  { id: 'spotify', title: 'Spotify', icon: './themes/Yaru/apps/spotify.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displaySpotify },
  { id: 'vscode', title: 'VS Code', icon: './themes/Yaru/apps/vscode.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayVsCode },
  { id: 'settings', title: 'Settings', icon: './themes/Yaru/apps/settings.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displaySettings },
  { id: 'chrome', title: 'Chrome', icon: './themes/Yaru/apps/chrome.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayChrome },
  { id: 'trash', title: 'Trash', icon: './themes/Yaru/apps/trash.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayTrash },
  { id: 'gedit', title: 'Gedit', icon: './themes/Yaru/apps/gedit.png', disabled: false, favourite: false, desktop_shortcut: false, screen: displayGedit },
  { id: 'about-alex', title: 'About Alex', icon: './themes/Yaru/apps/info.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayAboutAlex },
  { id: 'todoist', title: 'Todoist', icon: './themes/Yaru/apps/todoist.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayTodoist },
  { id: 'youtube', title: 'YouTube', icon: './themes/Yaru/apps/youtube.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayYouTube },
  { id: 'weather', title: 'Weather', icon: './themes/Yaru/apps/weather.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayWeather },
  { id: 'converter', title: 'Converter', icon: './themes/Yaru/apps/calc.png', disabled: false, favourite: false, desktop_shortcut: false, screen: displayConverter },
  { id: 'qr-tool', title: 'QR Tool', icon: './themes/Yaru/apps/qr.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayQrTool },
  { id: 'ascii-art', title: 'ASCII Art', icon: './themes/Yaru/apps/gedit.png', disabled: false, favourite: false, desktop_shortcut: false, screen: displayAsciiArt },
  { id: 'quote-generator', title: 'Quote Generator', icon: './themes/Yaru/apps/quote.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayQuoteGenerator },
  { id: 'showcase', title: 'Showcase', icon: './themes/Yaru/apps/showcase.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayShowcase },
  { id: 'project-gallery', title: 'Project Gallery', icon: './themes/Yaru/apps/projects.svg', disabled: false, favourite: false, desktop_shortcut: false, screen: displayProjectGallery },
  { id: 'terminal', title: 'Terminal', icon: './themes/Yaru/apps/utilities-terminal.png', disabled: false, favourite: false, desktop_shortcut: false, screen: displayTerminal },
  { id: 'calc', title: 'Calculator', icon: './themes/Yaru/apps/accessories-calculator.png', disabled: false, favourite: false, desktop_shortcut: false, screen: displayCalc },
];

export default apps;
