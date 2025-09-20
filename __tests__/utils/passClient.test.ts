import {
  AutofillRequestDetails,
  __resetPassClient,
  cancelAutofill,
  confirmAutofill,
  getAuditLog,
  getSecretField,
  listItems,
  requestAutofill,
  subscribeAutofillRequests,
} from '../../utils/passClient';

describe('passClient', () => {
  beforeEach(() => {
    __resetPassClient();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    __resetPassClient();
  });

  it('returns stored secrets and field values', () => {
    const items = listItems();
    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    expect(first.fields).toHaveProperty('password');
    expect(getSecretField(first.id, 'password')).toBe(first.fields.password);
  });

  it('resolves autofill requests when confirmed', async () => {
    const onFill = jest.fn();
    const requestPromise = new Promise<AutofillRequestDetails>((resolve) => {
      const unsubscribe = subscribeAutofillRequests((req) => {
        unsubscribe();
        resolve(req);
      });
    });

    const resultPromise = requestAutofill({
      targetAppId: 'browser',
      targetField: 'login.password',
      targetLabel: 'Login password',
      secretField: 'password',
      onFill,
    });

    const request = await requestPromise;
    expect(request.items.length).toBeGreaterThan(0);
    const selected = request.items[0];
    const expectedValue = selected.fields.password;
    expect(confirmAutofill(request.id, selected.id)).toBe(true);
    await expect(resultPromise).resolves.toBe(true);
    expect(onFill).toHaveBeenCalledWith(expectedValue);

    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      itemId: selected.id,
      targetAppId: 'browser',
      targetField: 'login.password',
      secretField: 'password',
    });
  });

  it('cancels pending requests cleanly', async () => {
    const requestPromise = new Promise<AutofillRequestDetails>((resolve) => {
      const unsubscribe = subscribeAutofillRequests((req) => {
        unsubscribe();
        resolve(req);
      });
    });

    const resultPromise = requestAutofill({
      targetAppId: 'browser',
      targetField: 'login.username',
      targetLabel: 'Login username',
      secretField: 'username',
      onFill: jest.fn(),
    });

    const request = await requestPromise;
    expect(cancelAutofill(request.id)).toBe(true);
    await expect(resultPromise).resolves.toBe(false);
    expect(getAuditLog()).toHaveLength(0);
  });
});

