import { test, expect } from '@playwright/test';

test.describe('Dummy form validation', () => {
  test('provides accessible validation feedback and submits successfully', async ({ page }) => {
    await page.goto('/dummy-form');

    const summary = page.locator('[data-testid="error-summary"]');
    await expect(summary).toHaveCount(0);

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(summary).toBeVisible();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('Name is required');
    await expect(summary).toContainText('Email is required');
    await expect(summary).toContainText('Message is required');

    const nameInput = page.getByLabel('Name');
    const emailInput = page.getByLabel('Email');
    const messageInput = page.getByLabel('Message');

    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
    await expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(messageInput).toHaveAttribute('aria-invalid', 'true');

    await summary.getByRole('link', { name: 'Name is required' }).click();
    await expect(nameInput).toBeFocused();

    await nameInput.fill('Alex Example');
    await messageInput.fill('Hello from Playwright.');

    await expect(summary.getByRole('link', { name: 'Name is required' })).toHaveCount(0);
    await expect(nameInput).not.toHaveAttribute('aria-invalid', 'true');

    await emailInput.fill('invalid-email');
    await expect(summary.getByRole('link', { name: 'Please enter a valid email' })).toBeVisible();

    await emailInput.fill('alex@example.com');

    await expect(summary).toHaveCount(0);

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Form submitted successfully!')).toBeVisible();
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');
    await expect(messageInput).toHaveValue('');
  });
});
