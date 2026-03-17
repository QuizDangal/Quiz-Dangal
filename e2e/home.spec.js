// E2E Test: Home Page
import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Quiz Dangal/);
    
    // Check current home hero content is visible
    await expect(page.getByRole('img', { name: 'Quiz Dangal' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Play Smart\./i })).toBeVisible();
  });

  test('should display category cards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for categories to load
    await page.waitForSelector('[aria-label*="Play"]');
    
    // Check the live public categories exist
    const categories = ['Opinion', 'GK'];
    for (const cat of categories) {
      await expect(page.locator(`text=${cat}`).first()).toBeVisible();
    }
  });

  test('should navigate to login when clicking sign in', async ({ page }) => {
    await page.goto('/');
    
    // Click sign in button
    const signInButton = page.getByRole('link', { name: /sign in/i }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('should show trending section', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Trending Now')).toBeVisible();
    await expect(page.getByRole('button', { name: /Play Today's Opinion quiz/i })).toBeVisible();
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
