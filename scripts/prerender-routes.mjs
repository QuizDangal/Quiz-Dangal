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
  { path: '/', title: 'Quiz Dangal – Play Quiz & Win | Refer & Earn', description: 'Quiz Dangal is India’s play-and-win quiz arena. Play daily opinion, GK, sports, and movie quizzes, grow streaks, invite friends, and redeem rewards.', robots: 'index, follow' },
  { path: '/leaderboards', title: 'Leaderboards – Quiz Dangal | Top Quiz Players', description: 'See the top players on Quiz Dangal leaderboards. Compete in daily opinion and knowledge quizzes, win coins, and climb ranks.' },
  { path: '/play-win-quiz-app', title: 'Play & Win – Quiz Dangal | How It Works', description: 'Play daily quizzes, climb leaderboards, and win rewards. Opinion-based and GK quizzes made for India – start free on Quiz Dangal.' },
  { path: '/opinion-quiz-app', title: 'Opinion Quiz – Quiz Dangal | Fun & Fast Rounds', description: 'Try quick, low-pressure opinion quizzes on Quiz Dangal. Share your take, compare with others, and earn coins as you play.' },
  { path: '/refer-earn-quiz-app', title: 'Refer & Earn – Quiz Dangal | Invite Friends, Get Coins', description: 'Invite friends to Quiz Dangal and earn bonus coins when they join and play opinion-based and GK quizzes.' },
  // SEO landing pages (keyword-targeted)
  { path: '/quiz-questions', title: 'Quiz Questions – Quiz Dangal', description: 'Practice quiz questions across GK, sports, science, and more. Play free on Quiz Dangal and improve your score daily.' },
  { path: '/quiz-questions-with-answers', title: 'Quiz Questions With Answers – Quiz Dangal', description: 'Explore quiz questions with answers and explanations. Play smart, build streaks, and learn faster on Quiz Dangal.' },
  { path: '/gk-quiz', title: 'GK Quiz – Quiz Dangal', description: 'Play a GK quiz daily and sharpen your general knowledge. Compete, earn coins, and climb the leaderboards.' },
  { path: '/gk-questions', title: 'GK Questions – Quiz Dangal', description: 'Practice GK questions for exams and daily learning. Attempt quizzes, track streaks, and level up your knowledge.' },
  { path: '/general-knowledge-quiz', title: 'General Knowledge Quiz – Quiz Dangal', description: 'Try a general knowledge quiz for quick practice. New questions daily—play free on Quiz Dangal.' },
  { path: '/hindi-quiz', title: 'Hindi Quiz – Quiz Dangal', description: 'Play Hindi quizzes across multiple topics. Quick rounds, daily streaks, and rewards on Quiz Dangal.' },
  { path: '/english-quiz', title: 'English Quiz – Quiz Dangal', description: 'Improve English with quick quizzes—vocabulary and more. Play, learn, and track your streak on Quiz Dangal.' },
  { path: '/online-quiz', title: 'Online Quiz – Quiz Dangal', description: 'Play online quizzes instantly on mobile or desktop. Join daily rounds, win coins, and climb the ranks.' },
  { path: '/science-quiz', title: 'Science Quiz – Quiz Dangal', description: 'Test your science knowledge with daily quizzes. Quick practice, fun rounds, and rewards on Quiz Dangal.' },
  { path: '/current-affairs-quiz', title: 'Current Affairs Quiz – Quiz Dangal', description: 'Stay updated with current affairs quizzes. Practice daily and improve your score on Quiz Dangal.' },
  { path: '/maths-quiz', title: 'Maths Quiz – Quiz Dangal', description: 'Practice maths with quick quizzes. Improve speed and accuracy with daily rounds on Quiz Dangal.' },
  { path: '/quiz-game', title: 'Quiz Game – Quiz Dangal', description: 'Play quiz games that are fast and competitive. Earn coins, build streaks, and win rewards.' },
  { path: '/quiz-competition', title: 'Quiz Competition – Quiz Dangal', description: 'Join quiz competitions and compete on leaderboards. Play daily rounds and win coins on Quiz Dangal.' },
  { path: '/quiz-app', title: 'Quiz App – Quiz Dangal', description: 'Use Quiz Dangal like a quiz app on your phone. Play daily quizzes, track streaks, and earn rewards.' },
  { path: '/quiz-for-kids', title: 'Quiz For Kids – Quiz Dangal', description: 'Fun quizzes for kids with easy questions across topics. Learn daily and enjoy quick rounds.' },
  { path: '/india-quiz', title: 'India Quiz – Quiz Dangal', description: 'Test your knowledge about India—history, culture, and more. Play free quizzes on Quiz Dangal.' },
  { path: '/sports-quiz', title: 'Sports Quiz – Quiz Dangal', description: 'Play sports quizzes on cricket, football, and more. Compete daily and climb the leaderboards.' },
  { path: '/cricket-quiz', title: 'Cricket Quiz – Quiz Dangal', description: 'Cricket quizzes for fans—IPL, records, players, and more. Play daily and win coins on Quiz Dangal.' },
  { path: '/about-us', title: 'About Us – Quiz Dangal', description: 'Quiz Dangal – India’s most exciting quiz and rewards platform where knowledge meets entertainment.' },
  { path: '/contact-us', title: 'Contact Us – Quiz Dangal', description: 'Get in touch with the Quiz Dangal team for support, partnership, or feedback.' },
  { path: '/terms-conditions', title: 'Terms & Conditions – Quiz Dangal', description: 'Read Quiz Dangal’s terms and conditions.' },
  { path: '/privacy-policy', title: 'Privacy Policy – Quiz Dangal', description: 'Learn how Quiz Dangal collects and protects your data.' },
  // Category landing pages (indexable)
  { path: '/category/opinion', title: 'Opinion Quizzes – Quiz Dangal', description: 'Play opinion-based quizzes. Share your take, compare with others, and earn coins as you play.' },
  { path: '/category/gk', title: 'GK Quizzes – Quiz Dangal', description: 'Sharpen your general knowledge with live and upcoming GK quizzes on Quiz Dangal.' },
  { path: '/category/sports', title: 'Sports Quizzes – Quiz Dangal', description: 'Test your sports knowledge with live and upcoming quizzes on cricket, football and more.' },
  { path: '/category/movies', title: 'Movie Quizzes – Quiz Dangal', description: 'Bollywood & Hollywood movie quizzes—play live rounds and win coins.' },
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
  // og tags
  out = out.replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  out = out.replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${url}" />`);
  // twitter tags
  out = out.replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  out = out.replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  return out;
}

function replaceStaticLoaderCopy(html, { title, description }) {
  let out = html;
  // Replace loader title (data-prerender-title)
  out = out.replace(
    /<h1([^>]*\bdata-prerender-title\b[^>]*)>[\s\S]*?<\/h1>/i,
    `<h1$1>${escapeHtml(title)}</h1>`,
  );
  // Replace loader description (data-prerender-desc)
  out = out.replace(
    /<p([^>]*\bdata-prerender-desc\b[^>]*)>[\s\S]*?<\/p>/i,
    `<p$1>${escapeHtml(description)}</p>`,
  );
  return out;
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
}

main().catch((err) => {
  console.error('prerender failed:', err?.stack || err?.message || err);
  process.exitCode = 1;
});
