import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: { default: 'SearchPilot | Clear SEO, real sources', template: '%s | SearchPilot' }, description: 'A calm workspace for SEO projects, real Search Console observations, homepage checks, and source-labelled client reports.', applicationName: 'SearchPilot', icons: { icon: '/icon.svg', apple: '/apple-icon.png' }, openGraph: { title: 'SearchPilot — clear SEO, real sources', description: 'Your SEO work, explained with source-labelled data.', type: 'website' } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html> }
