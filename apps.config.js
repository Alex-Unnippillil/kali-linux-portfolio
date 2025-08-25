import React from 'react';
import ReactGA from 'react-ga4';
import ErrorPane from './components/ErrorPane';
import { displayAboutAlex } from './components/apps/alex';
import { displayProjectGallery } from './components/apps/project-gallery';
import { displayAllApps } from './components/apps/all-apps';

export const THEME = process.env.NEXT_PUBLIC_THEME || 'Yaru';
const FALLBACK_THEME = 'Yaru';

const resolveAsset = (section, name) => {
  const themePath = `./themes/${THEME}/${section}/${name}`;
  const fallbackPath = `./themes/${FALLBACK_THEME}/${section}/${name}`;

  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(
        process.cwd(),
        'public',
        'themes',
        THEME,
        section,
        name
      );
      return fs.existsSync(fullPath) ? themePath : fallbackPath;
    } catch (_) {
      return fallbackPath;
    }
  }

  if (typeof Image !== 'undefined') {
    const testImg = new Image();
    testImg.onerror = () => {
      document.querySelectorAll(`img[src='${themePath}']`).forEach((el) => {
        el.src = fallbackPath;
      });
    };
    testImg.src = themePath;
  }

  return themePath;
};

export const icon = (name) => resolveAsset('apps', name);
export const sys = (name) => resolveAsset('system', name);

export class DynamicAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload() {
    this.setState({ hasError: false });
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
          message={`An error occurred while rendering ${this.props.name}. Please try again.`}
          onReload={this.handleReload}
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
  DisplayComponent.displayName =
    Component.displayName || Component.name || 'Component';
  return DisplayComponent;
};

// No additional dynamic games at this time
export const games = [];

const apps = [
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
    id: 'project-gallery',
    title: 'Project Gallery',
    icon: icon('project-gallery.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayProjectGallery,
  },
  {
    id: 'all-apps',
    title: 'All Apps',
    icon: icon('all-apps.svg'),
    disabled: false,
    favourite: false,
    desktop_shortcut: false,
    screen: displayAllApps,
  },
];

export default apps;
