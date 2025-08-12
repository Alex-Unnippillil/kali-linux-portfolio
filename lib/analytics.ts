import ReactGA from 'react-ga4';

export const gaSend = (options = {}) => {
  ReactGA.send(options);
};

export const gaEvent = (options = {}) => {
  ReactGA.event(options);
};

export default {
  gaSend,
  gaEvent,
};
