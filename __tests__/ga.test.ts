import { logEvent } from '../utils/ga';

describe('logEvent', () => {
  it('calls gtag if available', () => {
    const gtag = jest.fn();
    (window as any).gtag = gtag;
    logEvent('app_open', { id: 'test' });
    expect(gtag).toHaveBeenCalledWith('event', 'app_open', { id: 'test' });
  });
});
