const UNKNOWN_VALUE = 'Unknown';

interface NavigatorBrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUserAgentData {
  brands?: NavigatorBrandVersion[];
  mobile?: boolean;
  platform?: string;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUserAgentData;
}

export interface NeofetchEnvironment {
  navigator?: Navigator;
  screen?: Screen;
}

const globalScope = globalThis as typeof globalThis & {
  navigator?: NavigatorWithUAData;
  screen?: Screen;
};

const resolveNavigator = (env: NeofetchEnvironment): NavigatorWithUAData | undefined => {
  if (env.navigator) {
    return env.navigator as NavigatorWithUAData;
  }

  if (typeof globalScope.navigator !== 'undefined') {
    return globalScope.navigator;
  }

  return undefined;
};

const resolveScreen = (env: NeofetchEnvironment): Screen | undefined => {
  if (env.screen) {
    return env.screen;
  }

  if (typeof globalScope.screen !== 'undefined') {
    return globalScope.screen;
  }

  return undefined;
};

const formatUserAgent = (navigatorInstance?: NavigatorWithUAData): string => {
  if (!navigatorInstance) {
    return UNKNOWN_VALUE;
  }

  const data = navigatorInstance.userAgentData;

  if (data) {
    const brands = Array.isArray(data.brands) ? data.brands : [];
    const brandSummary =
      brands.length > 0
        ? brands
            .map((brand) => `${brand.brand}${brand.version ? ` ${brand.version}` : ''}`.trim())
            .join(', ')
        : undefined;

    const segments = [
      brandSummary,
      data.platform,
      data.mobile ? 'Mobile' : undefined,
    ].filter((segment): segment is string => Boolean(segment));

    if (segments.length > 0) {
      return segments.join(' | ');
    }
  }

  return navigatorInstance.userAgent || UNKNOWN_VALUE;
};

const formatLocale = (navigatorInstance?: NavigatorWithUAData): string => {
  if (!navigatorInstance) {
    return UNKNOWN_VALUE;
  }

  if (Array.isArray(navigatorInstance.languages) && navigatorInstance.languages.length > 0) {
    return navigatorInstance.languages.join(', ');
  }

  return navigatorInstance.language || UNKNOWN_VALUE;
};

const formatScreenDimensions = (screenInstance?: Screen): string => {
  if (!screenInstance) {
    return UNKNOWN_VALUE;
  }

  const { width, height } = screenInstance;

  if (width && height) {
    return `${width}x${height}`;
  }

  return UNKNOWN_VALUE;
};

export const getNeofetchReport = (env: NeofetchEnvironment = {}): string => {
  const navigatorInstance = resolveNavigator(env);
  const screenInstance = resolveScreen(env);

  const lines = [
    `User Agent: ${formatUserAgent(navigatorInstance)}`,
    `Locale: ${formatLocale(navigatorInstance)}`,
    `Screen: ${formatScreenDimensions(screenInstance)}`,
  ];

  return lines.join('\n');
};

export default getNeofetchReport;
