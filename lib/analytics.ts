import ReactGA from 'react-ga4';

let initialized = false;
let consentGranted = false;

export const initAnalytics = (measurementId?: string) => {
  if (measurementId && !initialized) {
    ReactGA.initialize(measurementId);
    initialized = true;
  }
};

export const setAnalyticsConsent = (consent: boolean) => {
  consentGranted = consent;
};

export const trackPageview = (page: string) => {
  if (initialized && consentGranted) {
    ReactGA.send({ hitType: 'pageview', page });
  }
};

export const trackEvent = (options: Parameters<typeof ReactGA.event>[0]) => {
  if (initialized && consentGranted) {
    ReactGA.event(options);
  }
};

