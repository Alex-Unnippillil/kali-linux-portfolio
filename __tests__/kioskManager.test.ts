import kioskManager from '../modules/kiosk/manager';

describe('kioskManager', () => {
  beforeEach(() => {
    kioskManager.listProfiles().forEach(profile => kioskManager.deleteProfile(profile.id));
    kioskManager.deactivateProfile('');
  });

  it('activates profiles and restricts apps', () => {
    const profile = kioskManager.createProfile({
      name: 'Demo kiosk',
      allowedApps: ['terminal'],
      restrictions: { disableAppSwitching: true },
      exitCredentials: { type: 'pin', secret: '1234' },
    });
    expect(kioskManager.canLaunchApp('about-alex')).toBe(true);
    expect(kioskManager.activateProfile(profile.id)).toBe(true);
    expect(kioskManager.canLaunchApp('terminal')).toBe(true);
    expect(kioskManager.canLaunchApp('about-alex')).toBe(false);
    expect(kioskManager.isRestrictionEnabled('disableAppSwitching')).toBe(true);
  });

  it('requires credentials to exit kiosk mode', () => {
    const profile = kioskManager.createProfile({
      name: 'Secure kiosk',
      allowedApps: ['settings'],
      restrictions: {},
      exitCredentials: { type: 'password', secret: 'letmein' },
    });
    kioskManager.activateProfile(profile.id);
    expect(kioskManager.deactivateProfile('wrong')).toBe(false);
    expect(kioskManager.getActiveProfile()).not.toBeNull();
    expect(kioskManager.deactivateProfile('letmein')).toBe(true);
    expect(kioskManager.getActiveProfile()).toBeNull();
  });
});
