import { test, expect } from '@playwright/test';
import aboutData from '../components/apps/alex/data.json';
import resumeData from '../components/apps/alex/resume.json';

test.describe('About Alex desktop shortcut', () => {
  test('opens resume view with dynamic data', async ({ page }) => {
    await page.goto('/');

    const aboutShortcut = page.getByRole('button', { name: 'About Alex' });
    await expect(aboutShortcut).toBeVisible();

    await aboutShortcut.dblclick();

    const aboutWindow = page.locator('#about');
    await expect(aboutWindow).toBeVisible();

    await aboutWindow.locator('#resume').click();

    const resumeSection = aboutWindow.locator('#resume-content');
    await expect(resumeSection).toBeVisible();

    const expectedStrings = [
      ...resumeData.skills,
      ...resumeData.projects.map((project) => project.name),
      ...resumeData.experience.flatMap((entry) => [entry.date, entry.description]),
      ...aboutData.milestones.flatMap((milestone) => [milestone.year, milestone.description]),
    ];

    for (const text of expectedStrings) {
      await expect(resumeSection, `Missing resume content: ${text}`).toContainText(text);
    }
  });
});
