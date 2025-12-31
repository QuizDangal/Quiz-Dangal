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
 * - Extensible for dynamic routes
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = 'https://quizdangal.com';

// Get current date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

/**
 * Static pages configuration
 * Add new pages here as the site grows
 */
const staticPages = [
  // High priority pages
  { path: '/', priority: 1.0, changefreq: 'weekly', hreflang: ['en', 'hi', 'x-default'] },
  { path: '/leaderboards/', priority: 0.8, changefreq: 'weekly' },
  
  // SEO landing pages
  { path: '/play-win-quiz-app/', priority: 0.7, changefreq: 'weekly' },
  { path: '/opinion-quiz-app/', priority: 0.7, changefreq: 'weekly' },
  { path: '/refer-earn-quiz-app/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-questions/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-questions-with-answers/', priority: 0.7, changefreq: 'weekly' },
  { path: '/gk-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/gk-questions/', priority: 0.7, changefreq: 'weekly' },
  { path: '/general-knowledge-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/hindi-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/english-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/online-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/science-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/current-affairs-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/maths-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-game/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-competition/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-app/', priority: 0.7, changefreq: 'weekly' },
  { path: '/quiz-for-kids/', priority: 0.6, changefreq: 'weekly' },
  { path: '/india-quiz/', priority: 0.6, changefreq: 'weekly' },
  { path: '/sports-quiz/', priority: 0.7, changefreq: 'weekly' },
  { path: '/cricket-quiz/', priority: 0.7, changefreq: 'weekly' },
  
  // Category pages (daily updated)
  { path: '/category/opinion', priority: 0.7, changefreq: 'daily' },
  { path: '/category/gk', priority: 0.7, changefreq: 'daily' },
  { path: '/category/sports', priority: 0.6, changefreq: 'daily' },
  { path: '/category/movies', priority: 0.6, changefreq: 'daily' },
  
  // Info pages
  { path: '/about-us/', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact-us/', priority: 0.6, changefreq: 'monthly' },
  { path: '/terms-conditions/', priority: 0.5, changefreq: 'yearly' },
  { path: '/privacy-policy/', priority: 0.5, changefreq: 'yearly' },
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
