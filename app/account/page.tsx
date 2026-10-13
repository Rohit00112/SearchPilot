import type { Metadata } from 'next';
import Workspace from '@/components/workspace';
export const metadata: Metadata = { title: 'My Account | SearchPilot' };
export default function AccountPage() { return <Workspace section="settings"/>; }
