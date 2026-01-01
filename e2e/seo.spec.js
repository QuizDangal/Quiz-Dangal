// E2E Test: SEO and Meta Tags
import { test, expect } from '@playwright/test';

test.describe('SEO', () => {
  test('home page should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    const title = await page.title();
    expect(title).toContain('Quiz Dangal');
    
    // Check meta description (use .first() for duplicates)
    const metaDescription = await page.locator('meta[name="description"]').first().getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription.length).toBeGreaterThan(50);
    
    // Check canonical URL
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    expect(canonical).toContain('quizdangal.com');
    
    // Check Open Graph tags
    const ogTitle = await page.locator('meta[property="og:title"]').first().getAttribute('content');
    expect(ogTitle).toBeTruthy();
    
    const ogDescription = await page.locator('meta[property="og:description"]').first().getAttribute('content');
    expect(ogDescription).toBeTruthy();
    
    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    expect(ogImage).toBeTruthy();
  });

  test('should have proper robots meta', async ({ page }) => {
    await page.goto('/');
    
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('index');
    expect(robots).toContain('follow');
  });

  test('login page should be noindex', async ({ page }) => {
    await page.goto('/login');
    
    // Login should not be indexed
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });
});

test.describe('PWA', () => {
  test('should have web manifest', async ({ page }) => {
    await page.goto('/');
    
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBeTruthy();
  });

  test('should have theme color', async ({ page }) => {
    await page.goto('/');
    
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
  });

  test('should have apple touch icon', async ({ page }) => {
    await page.goto('/');
    
    const appleTouchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect(appleTouchIcon).toBeTruthy();
  });
});
