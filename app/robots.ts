import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://travel-taste.example.com';

export default function robots(): MetadataRoute.Robots {
  // Block AI/LLM scrapers from training on this private content.
  // Allow general search crawlers on the landing page only; everything else
  // is private (passcode-gated) and explicitly disallowed.
  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'Google-Extended',
    'anthropic-ai',
    'ClaudeBot',
    'Claude-Web',
    'PerplexityBot',
    'Perplexity-User',
    'CCBot',
    'cohere-ai',
    'Bytespider',
    'Amazonbot',
    'FacebookBot',
    'meta-externalagent',
    'meta-externalfetcher',
    'Applebot-Extended',
    'AwarioRssBot',
    'AwarioSmartBot',
    'DataForSeoBot',
    'ImagesiftBot',
    'Diffbot',
    'Omgili',
    'Omgilibot',
    'YouBot',
    'PetalBot',
    'magpie-crawler',
    'MistralAI-User',
  ];

  return {
    rules: [
      // Default: search bots may crawl landing only.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/feed', '/feed/', '/admin', '/admin/', '/api/'],
      },
      // AI/LLM scrapers: full block.
      ...aiBots.map(ua => ({
        userAgent: ua,
        disallow: '/',
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
