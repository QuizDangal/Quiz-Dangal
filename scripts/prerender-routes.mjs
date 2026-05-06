import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getCategorySeoContent } from '../src/lib/categorySeoContent.js';
import { HUB_SEO_ARTICLES } from '../src/lib/hubSeoArticles.js';

/**
 * Prerender shallow HTML shells for important marketing routes so that
 * GitHub Pages serves them with HTTP 200 (not 404 + JS redirect).
 *
 * We copy the built dist/index.html and patch a few head tags
 * (title, description, canonical, og/twitter) per route, then write to
 * dist/<route>/index.html.
 */

const HOST = process.env.SITEMAP_BASE_URL || 'https://quizdangal.com';

/**
 * Routes to prerender. Keep these aligned with scripts/generate-sitemap.mjs.
 */
const ROUTES = [
  // Important: Root '/' serves the login view for non-auth users. We want bots to avoid indexing it.
  // Add robots: 'noindex, follow' for the prerendered root shell so non-JS crawlers do not index it.
  // Update: Home page is public-facing and should be indexable for discovery.
  // Serve robots: 'index, follow' so crawlers can index the landing page from the static HTML.
  { path: '/', title: 'Quiz Dangal \u2013 Daily Opinion & GK Quiz for IPL Fans', description: "Quiz Dangal is India\u2019s daily opinion and GK quiz arena. Play IPL season polls, current affairs rounds, and general knowledge quizzes, grow streaks, invite friends, and redeem rewards." },
  { path: '/leaderboards/', title: 'Leaderboards \u2013 Quiz Dangal | Top Quiz Players', description: 'See the top players on Quiz Dangal leaderboards. Compete in daily opinion and knowledge quizzes, win coins, and climb ranks.' },
  { path: '/play-win-quiz-app/', title: 'Play & Win \u2013 Quiz Dangal | How It Works', description: 'Play daily quizzes, climb leaderboards, and win rewards. Opinion-based and GK quizzes made for India \u2013 start free on Quiz Dangal.' },
  { path: '/opinion-quiz-app/', title: 'Opinion Quiz \u2013 Quiz Dangal | Fun & Fast Rounds', description: 'Try quick, low-pressure opinion quizzes on Quiz Dangal. Share your take, compare with others, and earn coins as you play.' },
  { path: '/refer-earn-quiz-app/', title: 'Refer & Earn \u2013 Quiz Dangal | Invite Friends, Get Coins', description: 'Invite friends to Quiz Dangal and earn bonus coins when they join and play opinion-based and GK quizzes.' },
  { path: '/gk-quiz/', title: 'GK Quiz \u2013 Quiz Dangal', description: 'Play a GK quiz daily and sharpen your general knowledge. Compete, earn coins, and climb the leaderboards.' },
  { path: '/cricket-quiz/', title: 'Cricket Quiz Online \u2013 Quiz Dangal | IPL & World Cup Trivia', description: 'Play the best cricket quiz online. Test your IPL, World Cup, and cricket trivia knowledge daily on Quiz Dangal.' },
  { path: '/current-affairs-quiz/', title: 'Current Affairs Quiz \u2013 Quiz Dangal | Daily GK for Exams', description: 'Daily current affairs quiz for UPSC, SSC, and bank exam prep. Stay updated and earn coins on Quiz Dangal.' },
  { path: '/bollywood-quiz/', title: 'Bollywood Quiz \u2013 Quiz Dangal | Movie & Celebrity Trivia', description: 'Play Bollywood quiz rounds covering iconic movies, songs, and celebrity trivia. New questions daily on Quiz Dangal.' },
  { path: '/about-us/', title: 'About Us \u2013 Quiz Dangal', description: 'Quiz Dangal \u2013 India\u2019s most exciting quiz and rewards platform where knowledge meets entertainment.' },
  { path: '/contact-us/', title: 'Contact Us \u2013 Quiz Dangal', description: 'Get in touch with the Quiz Dangal team for support, partnership, or feedback.' },
  { path: '/terms-conditions/', title: 'Terms & Conditions \u2013 Quiz Dangal', description: "Read Quiz Dangal\u2019s terms and conditions." },
  { path: '/privacy-policy/', title: 'Privacy Policy \u2013 Quiz Dangal', description: 'Learn how Quiz Dangal collects and protects your data.' },
  { path: '/category/opinion/', title: 'Opinion Quizzes \u2013 Quiz Dangal', description: 'Play opinion-based quizzes. Share your take, compare with others, and earn coins as you play.' },
  { path: '/category/gk/', title: 'GK Quizzes \u2013 Quiz Dangal', description: 'Sharpen your general knowledge with live and upcoming GK quizzes on Quiz Dangal.' },
  
  // ===== PRIVATE/USER ROUTES (Must be noindex) =====
  { path: '/login/', title: 'Login \u2013 Quiz Dangal', description: 'Log in to Quiz Dangal to track your streak and redeem rewards.', robots: 'noindex, nofollow' },
  { path: '/profile/', title: 'Profile \u2013 Quiz Dangal', description: 'Your Quiz Dangal profile.', robots: 'noindex, nofollow' },
  { path: '/wallet/', title: 'Wallet \u2013 Quiz Dangal', description: 'Your Quiz Dangal wallet balance and history.', robots: 'noindex, nofollow' },
  { path: '/my-quizzes/', title: 'My Quizzes \u2013 Quiz Dangal', description: 'View your completed and upcoming quizzes.', robots: 'noindex, nofollow' },
  { path: '/redemptions/', title: 'Redemptions \u2013 Quiz Dangal', description: 'Redeem your Quiz Dangal coins for rewards.', robots: 'noindex, nofollow' },
  { path: '/reset-password/', title: 'Reset Password \u2013 Quiz Dangal', description: 'Reset your Quiz Dangal password.', robots: 'noindex, nofollow' },
  { path: '/refer/', title: 'Referrals \u2013 Quiz Dangal', description: 'Your referrals on Quiz Dangal.', robots: 'noindex, nofollow' },
  { path: '/rewards/', title: 'Rewards \u2013 Quiz Dangal', description: 'Quiz Dangal rewards.', robots: 'noindex, nofollow' },
  { path: '/admin/', title: 'Admin \u2013 Quiz Dangal', description: 'Quiz Dangal administration.', robots: 'noindex, nofollow' },
];

const LEGACY_REDIRECTS = [
  { from: '/quiz-questions', to: '/play-win-quiz-app/' },
  { from: '/quiz-questions-with-answers', to: '/play-win-quiz-app/' },
  { from: '/online-quiz', to: '/play-win-quiz-app/' },
  { from: '/quiz-game', to: '/play-win-quiz-app/' },
  { from: '/quiz-competition', to: '/play-win-quiz-app/' },
  { from: '/quiz-app', to: '/play-win-quiz-app/' },
  { from: '/quiz-for-kids', to: '/play-win-quiz-app/' },
  { from: '/gk-questions', to: '/gk-quiz/' },
  { from: '/general-knowledge-quiz', to: '/gk-quiz/' },
  { from: '/science-quiz', to: '/gk-quiz/' },

  { from: '/maths-quiz', to: '/gk-quiz/' },
  { from: '/india-quiz', to: '/gk-quiz/' },
  { from: '/sports-quiz', to: '/gk-quiz/' },

  { from: '/hindi-quiz', to: '/gk-quiz/' },
  { from: '/english-quiz', to: '/gk-quiz/' },
  { from: '/category/sports', to: '/category/gk/' },
  { from: '/category/movies', to: '/category/gk/' },
];

const distDir = path.resolve('dist');
const srcIndex = path.join(distDir, 'index.html');

function toUrl(loc) {
  if (!loc || loc === '/') return HOST + '/';
  let out = `${HOST.replace(/\/$/, '')}${loc}`;
  // If this is a directory-like route (no file extension), add trailing slash to match GitHub Pages
  if (!/\.[a-z0-9]+$/i.test(loc) && !out.endsWith('/')) out += '/';
  return out;
}

function replaceHead(html, { title, description, url, robots }) {
  let out = html;
  // <title>
  out = out.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title data-rh="true">${title}</title>`);
  // meta description
  if (out.match(/<meta[^>]*name="description"[^>]*>/i)) {
    out = out.replace(/<meta[^>]*name="description"[^>]*>/i, `<meta data-rh="true" name="description" content="${escapeHtml(description)}" />`);
  } else {
    out = out.replace('</head>', `  <meta data-rh="true" name="description" content="${escapeHtml(description)}" />\n</head>`);
  }
  // robots
  if (robots) {
    if (out.match(/<meta[^>]*name="robots"[^>]*>/i)) {
      out = out.replace(/<meta[^>]*name="robots"[^>]*>/i, `<meta data-rh="true" name="robots" content="${escapeHtml(robots)}" />`);
    } else {
      out = out.replace('</head>', `  <meta data-rh="true" name="robots" content="${escapeHtml(robots)}" />\n</head>`);
    }
  }
  // canonical
  if (out.match(/<link[^>]*rel="canonical"[^>]*>/i)) {
    out = out.replace(/<link[^>]*rel="canonical"[^>]*>/i, `<link data-rh="true" rel="canonical" href="${url}" />`);
  } else {
    out = out.replace('</head>', `  <link data-rh="true" rel="canonical" href="${url}" />\n</head>`);
  }
  out = out.replace(/<link[^>]*rel="alternate"\s+hreflang="en-IN"[^>]*>/i, `<link data-rh="true" rel="alternate" hreflang="en-IN" href="${url}" />`);
  out = out.replace(/<link[^>]*rel="alternate"\s+hreflang="en"[^>]*>/i, `<link data-rh="true" rel="alternate" hreflang="en" href="${url}" />`);
  out = out.replace(/<link[^>]*rel="alternate"\s+hreflang="x-default"[^>]*>/i, `<link data-rh="true" rel="alternate" hreflang="x-default" href="${url}" />`);
  // og tags
  out = out.replace(/<meta[^>]*property="og:title"[^>]*>/i, `<meta data-rh="true" property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta[^>]*property="og:description"[^>]*>/i, `<meta data-rh="true" property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta[^>]*property="og:url"[^>]*>/i, `<meta data-rh="true" property="og:url" content="${url}" />`);
  // twitter tags
  out = out.replace(/<meta[^>]*name="twitter:title"[^>]*>/i, `<meta data-rh="true" name="twitter:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta[^>]*name="twitter:description"[^>]*>/i, `<meta data-rh="true" name="twitter:description" content="${escapeHtml(description)}" />`);
  out = out.replace(
    /<script type="application\/ld\+json">(?:(?!<\/script>)[\s\S])*?"@type":\s*"WebPage"(?:(?!<\/script>)[\s\S])*?<\/script>/i,
    `<script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "WebPage",\n    "name": "${escapeHtml(title)}",\n    "url": "${url}",\n    "description": "${escapeHtml(description)}",\n    "speakable": {\n      "@type": "SpeakableSpecification",\n      "cssSelector": ["[data-speakable]", "h1", ".qdh-title", ".qdh-faq-section"]\n    }\n  }\n</script>`
  );
  return out;
}

function replaceStaticLoaderCopy(html, { title, description }) {
  // Static loader is now spinner-only (no text). Kept as no-op for future use.
  return html;
}

/**
 * Inject static SEO content into the body for category pages so non-JS
 * crawlers (Bing, etc.) can index the keyword-rich introductions.
 * React will replace #root content on hydration.
 */
function injectCategorySeoContent(html, routePath) {
  if (!routePath.startsWith('/category/')) return html;
  const slug = routePath.replace('/category/', '').replace(/\/$/, '');
  const content = getCategorySeoContent(slug);
  if (!content || !content.paragraphs) return html;
  const seoHtml = [
    '<article data-prerender="seo" style="display:none; max-width:672px;margin:80px auto 0;padding:16px 20px;color:rgba(226,232,240,0.85);font-family:Poppins,system-ui,sans-serif;line-height:1.7;">',
    `<h2 style="font-size:1rem;font-weight:700;color:#fff;margin:0 0 12px;">${escapeHtml(content.heading)}</h2>`,
    ...content.paragraphs.map(p => `<p style="font-size:0.875rem;margin:0 0 10px;color:rgba(203,213,225,0.8);">${escapeHtml(p)}</p>`),
    '</article>',
  ].join('');
  return html.replace('<div id="root"></div>', `<div id="root"></div>\n${seoHtml}`);
}

/**
 * Inject static SEO article into the body for hub landing pages
 * (/gk-quiz/, /opinion-quiz-app/, /play-win-quiz-app/) so non-JS crawlers
 * can index the 500-word articles.
 */
function injectHubSeoArticle(html, routePath) {
  const map = {
    '/gk-quiz': 'gk',
    '/opinion-quiz-app': 'opinion',
    '/play-win-quiz-app': 'playwin',
    '/cricket-quiz': 'cricket',
    '/current-affairs-quiz': 'currentAffairs',
    '/bollywood-quiz': 'bollywood',
  };
  const clean = routePath.replace(/\/$/, '');
  const key = map[clean];
  if (!key || !HUB_SEO_ARTICLES[key]) return html;
  const article = HUB_SEO_ARTICLES[key];
  const articleHtml = [
    '<article data-prerender="hub-seo" style="display:none; max-width:672px;margin:40px auto;padding:16px 20px;color:rgba(226,232,240,0.85);font-family:Poppins,system-ui,sans-serif;line-height:1.7;">',
    `<h2 style="font-size:1.125rem;font-weight:700;color:#fff;margin:0 0 16px;">${escapeHtml(article.title)}</h2>`,
    ...article.sections.map(s =>
      `<h3 style="font-size:0.875rem;font-weight:600;color:#e2e8f0;margin:14px 0 6px;">${escapeHtml(s.heading)}</h3><p style="font-size:0.875rem;margin:0 0 10px;color:rgba(148,163,184,0.9);">${escapeHtml(s.text)}</p>`
    ),
    '</article>',
  ].join('');
  
  if (html.includes('</div><!-- root-end -->')) {
    return html.replace('</div><!-- root-end -->', `</div><!-- root-end -->\n${articleHtml}`);
  }
  return html.replace('<div id="root"></div>', `<div id="root"></div>\n${articleHtml}`);
}

function buildRedirectHtml(baseHtml, { from, to }) {
  const targetUrl = toUrl(to);
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting | Quiz Dangal</title>
  <meta name="robots" content="noindex, follow" />
  <meta name="description" content="This page has moved to ${escapeHtml(targetUrl)}" />
  <link rel="canonical" href="${targetUrl}" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body style="margin:0;font-family:Poppins,system-ui,sans-serif;background:#050508;color:#ffffff;display:grid;place-items:center;min-height:100vh;padding:24px;">
  <main style="max-width:560px;text-align:center;display:grid;gap:12px;">
    <h1 style="margin:0;font-size:clamp(1.75rem,4vw,2.5rem);line-height:1.1;">Redirecting you to the latest Quiz Dangal page</h1>
    <p style="margin:0;color:rgba(255,255,255,0.74);line-height:1.6;">This legacy URL has moved. If you are not redirected automatically, open the updated page below.</p>
    <p style="margin:0;"><a href="${targetUrl}" style="color:#a5b4fc;">${escapeHtml(targetUrl)}</a></p>
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const baseHtml = await fs.readFile(srcIndex, 'utf8');
  for (const route of ROUTES) {
    const url = toUrl(route.path);
    let html = replaceHead(baseHtml, {
      title: route.title,
      description: route.description,
      url,
      robots: route.robots,
    });

    // Keep above-the-fold static copy aligned with each route for non-JS crawlers and faster LCP.
    html = replaceStaticLoaderCopy(html, {
      title: route.title,
      description: route.description,
    });

    // Inject static SEO content for category pages (visible to non-JS crawlers).
    html = injectCategorySeoContent(html, route.path);

    // Inject static SEO article for hub landing pages.
    html = injectHubSeoArticle(html, route.path);

    const outDir = route.path === '/' ? distDir : path.join(distDir, route.path.replace(/^\//, ''));
    const outPath = path.join(outDir, 'index.html');
    await ensureDir(outDir);
    await fs.writeFile(outPath, html, 'utf8');
    console.log(`prerender: wrote ${outPath}`);
  }

  for (const redirect of LEGACY_REDIRECTS) {
    const outDir = path.join(distDir, redirect.from.replace(/^\//, ''));
    const outPath = path.join(outDir, 'index.html');
    await ensureDir(outDir);
    await fs.writeFile(outPath, buildRedirectHtml(baseHtml, redirect), 'utf8');
    console.log(`prerender: wrote redirect ${outPath} -> ${redirect.to}`);
  }
}

main().catch((err) => {
  console.error('prerender failed:', err?.stack || err?.message || err);
  process.exitCode = 1;
});
