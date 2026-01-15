#!/usr/bin/env node
/**
 * Dynamic Sitemap Generator for Quiz Dangal
 * 
 * Generates sitemap.xml with current dates and proper SEO structure.
 * Run: node scripts/generate-sitemap.mjs
 * 
 * Features:
 * - Auto-updates lastmod dates
 * - Supports hreflang for multilingual SEO
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
  // ===== HIGH PRIORITY - Main landing pages =====
  { path: '/', priority: 1.0, changefreq: 'daily', lastmod: '2026-01-15', hreflang: ['en', 'hi', 'x-default'] }, // Updated: sections removed
  { path: '/leaderboards/', priority: 0.8, changefreq: 'daily', lastmod: '2025-12-29' },
  
  // ===== SEO LANDING PAGES - Quiz keywords =====
  { path: '/play-win-quiz-app/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/opinion-quiz-app/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/refer-earn-quiz-app/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-questions/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-questions-with-answers/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/gk-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/gk-questions/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/general-knowledge-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/hindi-quiz/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/english-quiz/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/online-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/science-quiz/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/current-affairs-quiz/', priority: 0.8, changefreq: 'daily', lastmod: '2025-12-29' },
  { path: '/maths-quiz/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-game/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-competition/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-app/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/quiz-for-kids/', priority: 0.6, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/india-quiz/', priority: 0.7, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/sports-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  { path: '/cricket-quiz/', priority: 0.8, changefreq: 'weekly', lastmod: '2025-12-29' },
  
  // ===== CATEGORY PAGES - Updated with rich static content =====
  { path: '/category/opinion/', priority: 0.8, changefreq: 'daily', lastmod: '2026-01-15' }, // Updated: static content added
  { path: '/category/gk/', priority: 0.8, changefreq: 'daily', lastmod: '2026-01-15' }, // Updated: static content added
  { path: '/category/sports/', priority: 0.7, changefreq: 'daily', lastmod: '2026-01-15' }, // Updated: static content added
  { path: '/category/movies/', priority: 0.7, changefreq: 'daily', lastmod: '2026-01-15' }, // Updated: static content added
  
  // ===== INFORMATIONAL PAGES =====
  { path: '/about-us/', priority: 0.5, changefreq: 'monthly', lastmod: '2025-12-29' },
  { path: '/contact-us/', priority: 0.5, changefreq: 'monthly', lastmod: '2025-12-29' },
  { path: '/terms-conditions/', priority: 0.3, changefreq: 'yearly', lastmod: '2025-12-29' },
  { path: '/privacy-policy/', priority: 0.3, changefreq: 'yearly', lastmod: '2025-12-29' },
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
  
  // Add hreflang tags if specified
  if (page.hreflang && page.hreflang.length > 0) {
    for (const lang of page.hreflang) {
      xml += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${loc}" />\n`;
    }
  }
  
  xml += `  </url>\n`;
  return xml;
}

/**
 * Generate complete sitemap XML
 */
function generateSitemap() {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  
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
