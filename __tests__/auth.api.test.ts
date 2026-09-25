import { createMocks } from 'node-mocks-http';
import signupHandler from '../pages/api/auth/signup';
import verifyHandler from '../pages/api/auth/verify-email';
import loginHandler from '../pages/api/auth/login';
import profileHandler from '../pages/api/auth/profile';
import requestResetHandler from '../pages/api/auth/request-password-reset';
import resetPasswordHandler from '../pages/api/auth/reset-password';

describe('auth api flow', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  });

  test('supports signup -> verify -> login -> profile -> reset password', async () => {
    const signup = createMocks({
      method: 'POST',
      body: {
        username: 'authuser',
        displayName: 'Auth User',
        email: 'authuser@example.com',
        password: 'StrongPass123',
      },
    });
    await signupHandler(signup.req as any, signup.res as any);
    expect(signup.res._getStatusCode()).toBe(201);
    const signupBody = signup.res._getJSONData();
    expect(signupBody.ok).toBe(true);
    expect(signupBody.verificationPreview).toBeTruthy();

    const verify = createMocks({ method: 'POST', body: { token: signupBody.verificationPreview } });
    await verifyHandler(verify.req as any, verify.res as any);
    expect(verify.res._getStatusCode()).toBe(200);

    const login = createMocks({
      method: 'POST',
      body: { identifier: 'authuser@example.com', password: 'StrongPass123' },
    });
    await loginHandler(login.req as any, login.res as any);
    expect(login.res._getStatusCode()).toBe(200);
    const setCookie = login.res.getHeader('Set-Cookie');
    expect(setCookie).toBeTruthy();

    const profileGet = createMocks({ method: 'GET', headers: { cookie: String(setCookie) } });
    await profileHandler(profileGet.req as any, profileGet.res as any);
    expect(profileGet.res._getStatusCode()).toBe(200);

    const resetRequest = createMocks({
      method: 'POST',
      body: { email: 'authuser@example.com' },
    });
    await requestResetHandler(resetRequest.req as any, resetRequest.res as any);
    expect(resetRequest.res._getStatusCode()).toBe(200);
    const resetPreview = resetRequest.res._getJSONData().resetPreview;
    expect(resetPreview).toBeTruthy();

    const doReset = createMocks({
      method: 'POST',
      body: { token: resetPreview, newPassword: 'NewStrongPass123' },
    });
    await resetPasswordHandler(doReset.req as any, doReset.res as any);
    expect(doReset.res._getStatusCode()).toBe(200);

    const relogin = createMocks({
      method: 'POST',
      body: { identifier: 'authuser', password: 'NewStrongPass123' },
    });
    await loginHandler(relogin.req as any, relogin.res as any);
    expect(relogin.res._getStatusCode()).toBe(200);
  });
});
