import { test, expect } from '@playwright/test';

test.describe('Namma Tenant Navigator - Smoke Test Flow', () => {
  test('Wizard to PDF Demand Notice Flow', async ({ page }) => {
    // 1. Visit landing page
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toContainText('Your Rights as a Bengaluru Tenant');

    // 2. Accept privacy consent if visible
    const consentBtn = page.locator('#accept-consent-btn');
    if (await consentBtn.isVisible()) {
      await consentBtn.click();
    }

    // 3. Click Evaluate Your Lease CTA
    await page.locator('#evaluate-lease-btn').click();

    // 4. Wizard Step 1: Select Deposit dispute & continue
    await page.locator('text=Security Deposit Deductions or Delay').click();
    await page.locator('#wizard-next-btn').click();

    // 5. Wizard Step 2: Fill Tenant & Landlord Names
    await page.fill('input[placeholder="e.g. Rahul Nair"]', 'Aarav Sharma');
    await page.fill('input[placeholder="e.g. S. Venkatraman"]', 'M. Suresh');
    await page.fill('input[placeholder="e.g. #402, Palm Grove Heights, 100ft Road, Indiranagar"]', 'Flat 302, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru');
    await page.locator('#wizard-next-btn').click();

    // 6. Wizard Step 3: Financials
    await page.fill('input[type="number"] >> nth=0', '35000');
    await page.fill('input[type="number"] >> nth=1', '210000');
    await page.fill('input[type="number"] >> nth=2', '60000');
    await page.locator('#wizard-next-btn').click();

    // 7. Wizard Step 4: Review Facts & Run Analysis
    await page.locator('#run-analysis-btn').click();

    // 8. Wizard Step 5: Verify Legal Violations & Approve Generation
    await expect(page.locator('text=Statutory Violations & Demand')).toBeVisible({ timeout: 10000 });
    await page.locator('#confirm-generate-pdf-btn').click();

    // 9. Document Previewer & PDF download verification
    await expect(page.locator('text=Legal Demand Notice Preview')).toBeVisible({ timeout: 10000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-demand-notice-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Emergency Distress Triage Drawer', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.locator('#emergency-header-btn').click();
    await expect(page.locator('text=Emergency Distress Triage')).toBeVisible();
    await expect(page.locator('text=Section 27 Karnataka Rent Act, 1999')).toBeVisible();
    await expect(page.locator('text=112')).toBeVisible();
  });
});
