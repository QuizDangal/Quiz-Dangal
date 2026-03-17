#!/usr/bin/env node
/**
 * Dynamic Sitemap Generator for Quiz Dangal
 * 
 * Generates sitemap.xml with current dates and proper SEO structure.
 * Run: node scripts/generate-sitemap.mjs
 * 
 * Features:
 * - Auto-updates lastmod dates
 * - Proper priority and changefreq settings
 * - Only includes PUBLIC, indexable pages
 * 
 * IMPORTANT: Never add private/user pages here:
 * - /login, /profile, /wallet, /redemptions, /my-quizzes
 * - /quiz/:id, /results/:id (dynamic user routes)
 * - /admin, /debug, /refer
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://quizdangal.com';

// Get current date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

/**
 * Static pages configuration - ONLY PUBLIC INDEXABLE PAGES
 * DO NOT add user-specific or private routes here!
 * 
 * lastmod: Only update when actual content changes on the page
 */
const staticPages = [
  // ===== HIGH PRIORITY - Core pages =====
  { path: '/', priority: 1.0, changefreq: 'daily', lastmod: '2026-03-17' },
  { path: '/leaderboards/', priority: 0.8, changefreq: 'daily', lastmod: '2026-03-17' },

  // ===== PRODUCT EXPLAINERS =====
  { path: '/play-win-quiz-app/', priority: 0.8, changefreq: 'weekly', lastmod: '2026-03-17' },
  { path: '/opinion-quiz-app/', priority: 0.8, changefreq: 'weekly', lastmod: '2026-03-17' },
  { path: '/gk-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2026-03-17' },
  { path: '/refer-earn-quiz-app/', priority: 0.6, changefreq: 'monthly', lastmod: '2026-03-17' },

  // ===== CATEGORY PAGES =====
  { path: '/category/opinion/', priority: 0.8, changefreq: 'daily', lastmod: '2026-03-17' },
  { path: '/category/gk/', priority: 0.8, changefreq: 'daily', lastmod: '2026-03-17' },

  // ===== INFORMATIONAL PAGES =====
  { path: '/about-us/', priority: 0.5, changefreq: 'monthly', lastmod: '2026-03-17' },
  { path: '/contact-us/', priority: 0.5, changefreq: 'monthly', lastmod: '2026-03-17' },
  { path: '/terms-conditions/', priority: 0.3, changefreq: 'yearly', lastmod: '2026-03-17' },
  { path: '/privacy-policy/', priority: 0.3, changefreq: 'yearly', lastmod: '2026-03-17' },
];

/**
 * Generate XML for a single URL entry
 */
function generateUrlEntry(page) {
  const loc = `${SITE_URL}${page.path}`;
  const lastmod = page.lastmod || today;
  const priority =
    typeof page.priority === 'number' ? page.priority.toFixed(1) : String(page.priority);
  
  let xml = `  <url>\n`;
  xml += `    <loc>${loc}</loc>\n`;
  xml += `    <lastmod>${lastmod}</lastmod>\n`;
  xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
  xml += `    <priority>${priority}</priority>\n`;
  
  xml += `  </url>\n`;
  return xml;
}

/**
 * Generate complete sitemap XML
 */
function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  for (const page of staticPages) {
    xml += generateUrlEntry(page);
  }
  
  xml += `</urlset>\n`;
  return xml;
}

// Generate and write sitemap
const sitemap = generateSitemap();
const outputPath = join(__dirname, '..', 'public', 'sitemap.xml');

writeFileSync(outputPath, sitemap, 'utf-8');
console.log(`✅ Sitemap generated: ${outputPath}`);
console.log(`📅 Last modified date: ${today}`);
console.log(`📄 Total URLs: ${staticPages.length}`);
