import { promises as fs } from 'node:fs';
import path from 'node:path';

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
  { path: '/', title: 'Quiz Dangal – Daily Opinion & GK Quiz for IPL Fans', description: 'Quiz Dangal is India’s daily opinion and GK quiz arena. Play IPL season polls, current affairs rounds, and general knowledge quizzes, grow streaks, invite friends, and redeem rewards.', robots: 'index, follow' },
  { path: '/leaderboards', title: 'Leaderboards – Quiz Dangal | Top Quiz Players', description: 'See the top players on Quiz Dangal leaderboards. Compete in daily opinion and knowledge quizzes, win coins, and climb ranks.' },
  { path: '/play-win-quiz-app', title: 'Play & Win – Quiz Dangal | How It Works', description: 'Play daily quizzes, climb leaderboards, and win rewards. Opinion-based and GK quizzes made for India – start free on Quiz Dangal.' },
  { path: '/opinion-quiz-app', title: 'Opinion Quiz – Quiz Dangal | Fun & Fast Rounds', description: 'Try quick, low-pressure opinion quizzes on Quiz Dangal. Share your take, compare with others, and earn coins as you play.' },
  { path: '/refer-earn-quiz-app', title: 'Refer & Earn – Quiz Dangal | Invite Friends, Get Coins', description: 'Invite friends to Quiz Dangal and earn bonus coins when they join and play opinion-based and GK quizzes.' },
  { path: '/gk-quiz', title: 'GK Quiz – Quiz Dangal', description: 'Play a GK quiz daily and sharpen your general knowledge. Compete, earn coins, and climb the leaderboards.' },
  { path: '/about-us', title: 'About Us – Quiz Dangal', description: 'Quiz Dangal – India’s most exciting quiz and rewards platform where knowledge meets entertainment.' },
  { path: '/contact-us', title: 'Contact Us – Quiz Dangal', description: 'Get in touch with the Quiz Dangal team for support, partnership, or feedback.' },
  { path: '/terms-conditions', title: 'Terms & Conditions – Quiz Dangal', description: 'Read Quiz Dangal’s terms and conditions.' },
  { path: '/privacy-policy', title: 'Privacy Policy – Quiz Dangal', description: 'Learn how Quiz Dangal collects and protects your data.' },
  // Category landing pages (indexable)
  { path: '/category/opinion', title: 'Opinion Quizzes – Quiz Dangal', description: 'Play opinion-based quizzes. Share your take, compare with others, and earn coins as you play.' },
  { path: '/category/gk', title: 'GK Quizzes – Quiz Dangal', description: 'Sharpen your general knowledge with live and upcoming GK quizzes on Quiz Dangal.' },
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
  { from: '/current-affairs-quiz', to: '/gk-quiz/' },
  { from: '/maths-quiz', to: '/gk-quiz/' },
  { from: '/india-quiz', to: '/gk-quiz/' },
  { from: '/sports-quiz', to: '/gk-quiz/' },
  { from: '/cricket-quiz', to: '/gk-quiz/' },
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
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  // meta description
  if (out.match(/<meta\s+name="description"[^>]*>/i)) {
    out = out.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  } else {
    out = out.replace('</head>', `  <meta name="description" content="${escapeHtml(description)}" />\n</head>`);
  }
  // robots
  if (robots) {
    if (out.match(/<meta\s+name="robots"[^>]*>/i)) {
      out = out.replace(/<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="${escapeHtml(robots)}" />`);
    } else {
      out = out.replace('</head>', `  <meta name="robots" content="${escapeHtml(robots)}" />\n</head>`);
    }
  }
  // canonical
  if (out.match(/<link\s+rel="canonical"[^>]*>/i)) {
    out = out.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${url}" />`);
  } else {
    out = out.replace('</head>', `  <link rel="canonical" href="${url}" />\n</head>`);
  }
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="en-IN"[^>]*>/i, `<link rel="alternate" hreflang="en-IN" href="${url}" />`);
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="en"[^>]*>/i, `<link rel="alternate" hreflang="en" href="${url}" />`);
  out = out.replace(/<link\s+rel="alternate"\s+hreflang="x-default"[^>]*>/i, `<link rel="alternate" hreflang="x-default" href="${url}" />`);
  // og tags
  out = out.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`);
  // twitter tags
  out = out.replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  out = out.replace(
    /<script type="application\/ld\+json">\s*\{[\s\S]*?"@type": "WebPage"[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "WebPage",\n    "name": "${escapeHtml(title)}",\n    "url": "${url}",\n    "description": "${escapeHtml(description)}",\n    "speakable": {\n      "@type": "SpeakableSpecification",\n      "cssSelector": ["[data-speakable]", "h1", ".qdh-title", ".qdh-faq-section"]\n    }\n  }\n</script>`
  );
  return out;
}

function replaceStaticLoaderCopy(html, { title, description }) {
  // Static loader is now spinner-only (no text). Kept as no-op for future use.
  return html;
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
