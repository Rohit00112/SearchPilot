import type { Metadata, Viewport } from 'next';
import './globals.css';

const tagline = 'Clear SEO. Real sources.';
const description = 'Understand your SEO with connected Search Console data, bounded homepage checks, and clearly sourced reports.';
const socialImage = {
  url: '/brand/searchpilot-social.png',
  width: 1200,
  height: 630,
  alt: 'SearchPilot: Clear SEO. Real sources. An open-page waypoint mark on a pine-green background.',
};

function publicSiteUrl(): URL | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_ORIGIN;
  const localDev = process.env.NODE_ENV === 'development';
  if (!configured) return localDev ? new URL('http://localhost:3000') : undefined;
  try {
    const url = new URL(configured);
    const isLoopback = url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' || url.hostname === '[::1]';
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return undefined;
    if (!localDev && (url.protocol !== 'https:' || isLoopback)) return undefined;
    return url.protocol === 'https:' || (localDev && url.protocol === 'http:') ? url : undefined;
  } catch {
    return undefined;
  }
}

const metadataOrigin = publicSiteUrl();

export const metadata: Metadata = {
  metadataBase: metadataOrigin,
  title: { default: 'SearchPilot | ' + tagline, template: '%s | SearchPilot' },
  description,
  applicationName: 'SearchPilot',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '1024x1024', type: 'image/png' }],
  },
  openGraph: {
    title: 'SearchPilot — ' + tagline,
    description,
    siteName: 'SearchPilot',
    type: 'website',
    locale: 'en_US',
    ...(metadataOrigin ? { images: [socialImage] } : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchPilot — ' + tagline,
    description,
    ...(metadataOrigin ? { images: [socialImage.url] } : {}),
  },
};

export const viewport: Viewport = { themeColor: '#172F2B', colorScheme: 'light' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
