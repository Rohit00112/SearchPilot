import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SearchPilot — Clear SEO. Real sources.',
    short_name: 'SearchPilot',
    description: 'Source-labelled Search Console observations, homepage checks, and SEO reports.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F8F6F1',
    theme_color: '#172F2B',
    icons: [
      { src: '/brand/searchpilot-app-icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/brand/searchpilot-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
