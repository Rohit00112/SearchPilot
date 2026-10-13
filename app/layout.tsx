import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'SearchPilot | SEO intelligence', description: 'Modern SEO analytics, research, and site performance workspace.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html> }
