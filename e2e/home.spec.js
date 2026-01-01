// E2E Test: Home Page
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Quiz Dangal/);
    
    // Check main heading is visible (specific selector)
    await expect(page.getByRole('link', { name: 'Go to home page' })).toBeVisible();
  });

  test('should display category cards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for categories to load
    await page.waitForSelector('[aria-label*="Play"]');
    
    // Check all 4 categories exist
    const categories = ['Opinion', 'GK', 'Sports', 'Movies'];
    for (const cat of categories) {
      await expect(page.locator(`text=${cat}`).first()).toBeVisible();
    }
  });

  test('should navigate to login when clicking sign in', async ({ page }) => {
    await page.goto('/');
    
    // Click sign in button
    const signInButton = page.locator('a[href="/login"]');
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should show FAQ section', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to FAQ
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check FAQ exists
    await expect(page.locator('text=What is Quiz Dangal').first()).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have no major accessibility violations on home', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic a11y - proper heading structure
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Check images have alt text
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
