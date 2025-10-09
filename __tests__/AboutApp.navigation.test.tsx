import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactGA from 'react-ga4';
import AboutApp from '../components/apps/About';
import data from '../components/apps/alex/data.json';

jest.mock('react-ga4', () => ({
  __esModule: true,
  default: {
    send: jest.fn(),
    event: jest.fn(),
  },
}));

const { send: sendMock, event: eventMock } = ReactGA as unknown as {
  send: jest.Mock;
  event: jest.Mock;
};

type Section = {
  id: string;
  label: string;
};

const sections = (data as { sections: Section[] }).sections;

const sectionText: Record<string, RegExp> = {
  about: /Cybersecurity Specialist/i,
  education: /Networking and Information Technology Security/i,
  skills: /Technical Skills/i,
  certs: /Certifications & Typing Speed/i,
  projects: /text-encryption-decryption-aes-pkcs7/i,
  resume: /Download the resume/i,
};

const expectContent = (pattern: RegExp) =>
  waitFor(() => {
    const matches = screen.queryAllByText(
      (_content, element) => {
        const text = element?.textContent ?? '';
        return pattern.test(text);
      },
      { selector: '*' }
    );
    expect(matches.length).toBeGreaterThan(0);
  });

describe('AboutApp navigation flows', () => {
  const localStorageProto = Object.getPrototypeOf(window.localStorage) as Storage;
  let getItemSpy: jest.SpyInstance<string | null, [string]>;
  let setItemSpy: jest.SpyInstance<void, [string, string]>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    sendMock.mockClear();
    eventMock.mockClear();
    getItemSpy = jest
      .spyOn(localStorageProto, 'getItem')
      .mockReturnValue(null);
    setItemSpy = jest.spyOn(localStorageProto, 'setItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('activates each desktop nav tab and renders the correct screen', async () => {
    render(<AboutApp />);

    await expectContent(sectionText.about);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: '/about' })
    );
    sendMock.mockClear();
    setItemSpy.mockClear();

    const tablist = screen.getAllByRole('tablist')[0];

    for (const section of sections) {
      const tab = within(tablist).getByRole('tab', {
        name: new RegExp(section.label, 'i'),
      });
      await user.click(tab);

      const expectation = sectionText[section.id];
      expect(expectation).toBeDefined();
      await expectContent(expectation);

      await waitFor(() =>
        expect(sendMock).toHaveBeenCalledWith(
          expect.objectContaining({ page: `/${section.id}` })
        )
      );
      await waitFor(() =>
        expect(setItemSpy).toHaveBeenCalledWith('about-section', section.id)
      );

      sendMock.mockClear();
      setItemSpy.mockClear();
    }
  });

  it('toggles the mobile nav drawer and keeps keyboard focus working', async () => {
    render(<AboutApp />);

    await expectContent(sectionText.about);

    const tablists = screen.getAllByRole('tablist', { hidden: true });
    expect(tablists.length).toBeGreaterThan(1);
    const mobileTablist = tablists[1];
    const toggle = mobileTablist.parentElement as HTMLElement;

    expect(mobileTablist.classList.contains('invisible')).toBe(true);

    await user.click(toggle);

    expect(mobileTablist.classList.contains('visible')).toBe(true);
    expect(mobileTablist.classList.contains('invisible')).toBe(false);
    expect(mobileTablist).toHaveAttribute('aria-orientation', 'vertical');

    const mobileTabs = within(mobileTablist).getAllByRole('tab');

    await user.click(mobileTabs[0]);
    sendMock.mockClear();
    setItemSpy.mockClear();

    await user.keyboard('{ArrowDown}');

    await waitFor(() => expect(mobileTabs[1]).toHaveFocus());
    await waitFor(() =>
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ page: `/${sections[1].id}` })
      )
    );
    await waitFor(() =>
      expect(setItemSpy).toHaveBeenCalledWith('about-section', sections[1].id)
    );
  });
});
