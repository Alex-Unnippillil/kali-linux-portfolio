import { test, expect, type Locator } from '@playwright/test';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function firstPresent(locators: Locator[]): Promise<Locator> {
  for (const locator of locators) {
    if ((await locator.count()) > 0) {
      return locator.first();
    }
  }
  throw new Error('No matching locator found');
}

async function maybeFirst(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    if ((await locator.count()) > 0) {
      return locator.first();
    }
  }
  return null;
}

test('Ops dashboard handles SLO workflows and exports cleanly', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('/ops-dashboard');

  const heading = await firstPresent([
    page.getByRole('heading', { name: /(ops|operations).*dashboard/i }),
    page.getByRole('heading', { name: /operations command center/i }),
  ]);
  await expect(heading).toBeVisible();

  const sloTrigger = await firstPresent([
    page.getByRole('button', { name: /slo|error budget|breach/i }),
    page.locator('[data-testid="simulate-slo-breach"]'),
    page.locator('[data-test="simulate-slo-breach"]'),
  ]);
  await sloTrigger.click();

  const sloStatus = await firstPresent([
    page.locator('[data-testid="slo-status"]'),
    page.locator('[data-test="slo-status"]'),
    page.getByRole('status', { name: /slo|error budget/i }),
    page.locator('section:has-text(/SLO|Error Budget/i)').locator('text=/breach|violat|degrad|critical/i'),
  ]);
  await expect(sloStatus).toContainText(/breach|violat|degrad|critical/i);

  let newRouteLabel: string | null = null;
  const routeSelect = page.getByRole('combobox', { name: /alert|route|channel/i });
  if (await routeSelect.count()) {
    const options = routeSelect.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      const targetOption = options.nth(1);
      newRouteLabel = (await targetOption.textContent())?.trim() || null;
      const optionValue = (await targetOption.getAttribute('value')) || undefined;
      if (optionValue) {
        await routeSelect.selectOption(optionValue);
      } else if (newRouteLabel) {
        await routeSelect.selectOption({ label: newRouteLabel });
      } else {
        await routeSelect.selectOption({ index: 1 });
      }
    } else {
      newRouteLabel = (await options.first().textContent())?.trim() || null;
    }
  } else {
    const routeActivator = await firstPresent([
      page.locator('[data-testid="alert-route"]'),
      page.locator('[data-test="alert-route"]'),
      page.getByRole('button', { name: /route|channel|pager|chatops|email|slack|sms|primary|secondary|on[- ]?call/i }),
      page.getByRole('switch', { name: /route|channel|pager|chatops|email|slack|sms|primary|secondary|on[- ]?call/i }),
    ]);
    await routeActivator.click();
    const routeChoice = await firstPresent([
      page.getByRole('menuitem', { name: /chat|pager|email|slack|sms|secondary|backup|primary|pagerduty|ticket/i }),
      page.getByRole('option', { name: /chat|pager|email|slack|sms|secondary|backup|primary|pagerduty|ticket/i }),
      page.getByRole('button', { name: /chat|pager|email|slack|sms|secondary|backup|primary|pagerduty|ticket/i }),
    ]);
    newRouteLabel = (await routeChoice.innerText())?.trim() || null;
    await routeChoice.click();
  }

  if (newRouteLabel) {
    const activeRoute = await maybeFirst([
      page.locator('[data-testid="active-route"]'),
      page.locator('[data-test="active-route"]'),
      page.getByText(new RegExp(`active route.*${escapeRegex(newRouteLabel)}`, 'i')),
      page.getByText(new RegExp(`current route.*${escapeRegex(newRouteLabel)}`, 'i')),
      page.getByText(new RegExp(`\\b${escapeRegex(newRouteLabel)}\\b`, 'i')),
    ]);
    if (activeRoute) {
      await expect(activeRoute).toBeVisible();
    }
  }

  const summary = `Synthetic incident ${Date.now()}`;
  const summaryField = await firstPresent([
    page.locator('[data-testid="incident-summary"]'),
    page.locator('[data-test="incident-summary"]'),
    page.getByLabel(/incident (summary|title|name)/i),
    page.getByPlaceholder(/incident (summary|title|name)/i),
    page.locator('input[name*=incident][type="text"]'),
  ]);
  await summaryField.fill(summary);

  const detailsField = await maybeFirst([
    page.locator('[data-testid="incident-notes"]'),
    page.locator('[data-test="incident-notes"]'),
    page.getByLabel(/details|notes|description/i),
    page.getByPlaceholder(/details|notes|description/i),
    page.locator('textarea'),
  ]);
  if (detailsField) {
    await detailsField.fill('Logged automatically via Playwright workflow.');
  }

  const severityField = await maybeFirst([
    page.locator('[data-testid="incident-severity"]'),
    page.locator('[data-test="incident-severity"]'),
    page.getByLabel(/severity/i),
    page.getByRole('combobox', { name: /severity/i }),
  ]);
  if (severityField) {
    const severityOptions = severityField.locator('option');
    const severityCount = await severityOptions.count();
    if (severityCount > 1) {
      const targetSeverity = severityOptions.nth(Math.max(1, severityCount - 1));
      const severityValue = (await targetSeverity.getAttribute('value')) || undefined;
      const severityLabel = (await targetSeverity.textContent())?.trim();
      if (severityValue) {
        await severityField.selectOption(severityValue);
      } else if (severityLabel) {
        await severityField.selectOption({ label: severityLabel });
      }
    }
  }

  const logButton = await firstPresent([
    page.locator('[data-testid="log-incident"]'),
    page.locator('[data-test="log-incident"]'),
    page.getByRole('button', { name: /log incident|add incident|create incident|save incident|submit/i }),
  ]);
  await logButton.click();

  const incidentContainer = await maybeFirst([
    page.locator('[data-testid="incident-log"]'),
    page.locator('[data-test="incident-log"]'),
    page.getByRole('table', { name: /incident|log/i }),
    page.locator('section:has-text(/incident log|recent incidents|runbook/i)'),
  ]);
  const incidentAssertionTarget = incidentContainer
    ? incidentContainer.getByText(summary)
    : page.getByText(summary);
  await expect(incidentAssertionTarget).toBeVisible();

  const exportButton = await firstPresent([
    page.locator('[data-testid="export-incidents"]'),
    page.locator('[data-test="export-incidents"]'),
    page.getByRole('button', { name: /export|download|csv|json/i }),
  ]);
  const downloadPromise = page.waitForEvent('download').catch(() => null);
  await exportButton.click();
  const download = await downloadPromise;
  if (download) {
    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/ops|incident|dashboard|log|json|csv/i);
  }

  expect(consoleErrors).toEqual([]);
});
