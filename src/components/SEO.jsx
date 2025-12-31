import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';

function safeJsonLdStringify(value) {
  // JSON-LD is injected into a <script> tag, so we must prevent the sequence `</script>`
  // (and other tag breaks) from appearing in the raw HTML.
  // Escape <, >, & and Unicode line separators for complete XSS protection.
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Generate FAQ structured data for SEO
 * @param {Array} faqs - Array of {question, answer} objects
 * @returns {Object} JSON-LD FAQPage schema
 */
function generateFAQSchema(faqs) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}

/**
 * Generate HowTo structured data for SEO
 * @param {Object} howTo - {name, description, steps: [{name, text}]}
 * @returns {Object} JSON-LD HowTo schema
 */
function generateHowToSchema(howTo) {
  if (!howTo || !Array.isArray(howTo.steps)) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/**
 * SeoHead component with AEO (AI Engine Optimization) support
 * Enhanced for better search engine visibility and social sharing
 * Props:
 * - title: string (required)
 * - description: string
 * - canonical: absolute URL (preferred)
 * - robots: e.g. "index, follow" or "noindex, nofollow"
 * - image: absolute URL for og:image/twitter:image
 * - type: og:type (website/article/profile etc)
 * - keywords: string[] list – optional
 * - author: string – author/creator for AI attribution
 * - datePublished: string – ISO date for content freshness signals
 * - dateModified: string – ISO date for last update
 * - twitterCardType: 'summary' | 'summary_large_image' – controls Twitter card size
 * - noindex: boolean – quick way to set noindex
 * - articleSection: string – article section/category
 * - wordCount: number – word count for articles
 * - readingTime: string – estimated reading time
 * - faqs: Array<{question, answer}> – FAQ structured data
 * - howTo: {name, description, steps} – HowTo structured data
 */
export default function SeoHead({
  title = 'Quiz Dangal',
  description = 'Play opinion-based quizzes, refer & earn, and win rewards on Quiz Dangal.',
  canonical = 'https://quizdangal.com/',
  robots = 'index, follow',
  image = 'https://quizdangal.com/refer-earn-poster.png?v=1',
  imageAlt = 'Quiz Dangal poster',
  type = 'website',
  keywords = [],
  lang = 'en-IN',
  alternateLocales = ['en_US'],
  twitterHandle = '@quizdangal',
  twitterCardType = 'summary_large_image',
  jsonLd = [],
  author = 'Quiz Dangal',
  datePublished = '2025-01-01',
  dateModified = null,
  noindex = false,
  articleSection = null,
  wordCount = null,
  readingTime = null,
  faqs = null,
  howTo = null,
}) {
  // Safely handle null/undefined keywords
  const safeKeywords = Array.isArray(keywords) ? keywords : [];
  const keywordsContent = safeKeywords.length ? safeKeywords.join(', ') : undefined;

  const normalizedLang = typeof lang === 'string' && lang ? lang : 'en-IN';
  const ogLocale = normalizedLang.replace('-', '_');
  const alternateHrefLang = normalizedLang.toLowerCase();
  // Normalize jsonLd to array
  const getJsonLdBlocks = () => {
    const blocks = [];
    
    // Add provided jsonLd blocks
    if (Array.isArray(jsonLd)) {
      blocks.push(...jsonLd);
    } else if (jsonLd) {
      blocks.push(jsonLd);
    }
    
    // Add FAQ schema if provided
    const faqSchema = generateFAQSchema(faqs);
    if (faqSchema) blocks.push(faqSchema);
    
    // Add HowTo schema if provided
    const howToSchema = generateHowToSchema(howTo);
    if (howToSchema) blocks.push(howToSchema);
    
    return blocks;
  };
  const jsonLdBlocks = getJsonLdBlocks();
  const toHrefLang = (loc) =>
    String(loc || '')
      .replaceAll('_', '-')
      .toLowerCase();

  // Determine final robots value
  const finalRobots = noindex ? 'noindex, nofollow' : robots;
  
  // Enhanced max-snippet for better SERP appearance
  const enhancedRobots = finalRobots.includes('noindex') 
    ? finalRobots 
    : `${finalRobots}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`;

  return (
    <Helmet>
      <html lang={normalizedLang} />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {keywordsContent && <meta name="keywords" content={keywordsContent} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {finalRobots && <meta name="robots" content={enhancedRobots} />}
      {finalRobots && <meta name="googlebot" content={enhancedRobots} />}
      {finalRobots && <meta name="bingbot" content={enhancedRobots} />}

      {/* AI/LLM Authority Signals */}
      {author && <meta name="author" content={author} />}
      {author && <meta name="publisher" content={author} />}
      {author && <meta name="creator" content={author} />}
      {datePublished && <meta name="date" content={datePublished} />}
      {dateModified && <meta name="last-modified" content={dateModified} />}
      {datePublished && <meta name="article:published_time" content={datePublished} />}
      {dateModified && <meta name="article:modified_time" content={dateModified} />}
      {articleSection && <meta name="article:section" content={articleSection} />}
      <meta name="copyright" content="Quiz Dangal" />
      <meta name="application-name" content="Quiz Dangal" />
      
      {/* Dublin Core metadata for academic/AI attribution */}
      <meta name="DC.title" content={title} />
      {description && <meta name="DC.description" content={description} />}
      {author && <meta name="DC.creator" content={author} />}
      <meta name="DC.publisher" content="Quiz Dangal" />
      <meta name="DC.language" content={normalizedLang} />
      
      {/* Content metadata */}
      {wordCount && <meta name="wordCount" content={String(wordCount)} />}
      {readingTime && <meta name="readingTime" content={readingTime} />}
      <meta name="rating" content="General" />
      <meta name="distribution" content="global" />
      <meta name="coverage" content="India" />
      <meta name="revisit-after" content="3 days" />

      {canonical && (
        <>
          <link rel="alternate" hrefLang="x-default" href={canonical} />
          <link rel="alternate" hrefLang={toHrefLang(alternateHrefLang)} href={canonical} />
        </>
      )}
      {canonical &&
        alternateLocales.map((locale) => (
          <link key={locale} rel="alternate" hrefLang={toHrefLang(locale)} href={canonical} />
        ))}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Quiz Dangal" />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((locale) => (
        <meta
          key={locale}
          property="og:locale:alternate"
          content={String(locale).replace('-', '_')}
        />
      ))}
      <meta property="og:title" content={title} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:secure_url" content={image} />}
      {image && imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      {/* Article-specific OG tags */}
      {type === 'article' && datePublished && (
        <meta property="article:published_time" content={datePublished} />
      )}
      {type === 'article' && dateModified && (
        <meta property="article:modified_time" content={dateModified} />
      )}
      {type === 'article' && author && <meta property="article:author" content={author} />}
      {type === 'article' && articleSection && (
        <meta property="article:section" content={articleSection} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCardType} />
      <meta name="twitter:title" content={title} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
      {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      {twitterHandle && <meta name="twitter:creator" content={twitterHandle} />}

      {jsonLdBlocks.map((block) => (
        <script
          key={block['@type'] || safeJsonLdStringify(block).slice(0, 50)}
          type="application/ld+json"
        >
          {safeJsonLdStringify(block)}
        </script>
      ))}
    </Helmet>
  );
}

SeoHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  canonical: PropTypes.string,
  robots: PropTypes.string,
  image: PropTypes.string,
  imageAlt: PropTypes.string,
  type: PropTypes.string,
  keywords: PropTypes.arrayOf(PropTypes.string),
  lang: PropTypes.string,
  alternateLocales: PropTypes.arrayOf(PropTypes.string),
  twitterHandle: PropTypes.string,
  twitterCardType: PropTypes.oneOf(['summary', 'summary_large_image']),
  jsonLd: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  author: PropTypes.string,
  datePublished: PropTypes.string,
  dateModified: PropTypes.string,
  noindex: PropTypes.bool,
  articleSection: PropTypes.string,
  wordCount: PropTypes.number,
  readingTime: PropTypes.string,
  faqs: PropTypes.arrayOf(
    PropTypes.shape({
      question: PropTypes.string.isRequired,
      answer: PropTypes.string.isRequired,
    })
  ),
  howTo: PropTypes.shape({
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    steps: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
  }),
};
