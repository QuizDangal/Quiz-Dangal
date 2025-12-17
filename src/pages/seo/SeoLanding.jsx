import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';

function toCanonical(pathname) {
  const p = String(pathname || '/');
  const clean = p.startsWith('/') ? p : `/${p}`;
  return `https://quizdangal.com${clean.endsWith('/') ? clean : `${clean}/`}`;
}

export default function SeoLanding({
  path = '/',
  title,
  h1,
  description,
  keywords = [],
  relatedLinks = [],
  faqs = [],
}) {
  const canonical = useMemo(() => toCanonical(path), [path]);

  const faqSchema = useMemo(() => {
    const entries = Array.isArray(faqs) ? faqs.filter(Boolean) : [];
    if (!entries.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entries.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };
  }, [faqs]);

  const webPageSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: canonical,
      description,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Quiz Dangal',
        url: 'https://quizdangal.com/',
      },
    }),
    [canonical, description, title],
  );

  const jsonLd = useMemo(() => {
    const blocks = [webPageSchema];
    if (faqSchema) blocks.push(faqSchema);
    return blocks;
  }, [faqSchema, webPageSchema]);

  return (
    <div className="container mx-auto px-3 sm:px-5 pt-6 sm:pt-8 pb-24">
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        keywords={keywords}
        jsonLd={jsonLd}
      />

      <section className="qd-card rounded-3xl p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold qd-gradient-text tracking-tight">
          {h1}
        </h1>
        <p className="mt-3 text-white/80 leading-relaxed max-w-3xl">{description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl px-8 py-3 text-lg font-extrabold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Play on Quiz Dangal"
          >
            Play Now
          </Link>
        </div>

        {Array.isArray(relatedLinks) && relatedLinks.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white">Popular on Quiz Dangal</h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {relatedLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className="text-sm font-semibold text-white/85 hover:text-white underline underline-offset-4"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {Array.isArray(faqs) && faqs.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white">FAQs</h2>
            <div className="mt-4 space-y-4">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <h3 className="font-semibold text-white">{item.question}</h3>
                  <p className="mt-1 text-white/75 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
