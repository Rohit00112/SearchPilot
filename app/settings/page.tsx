import type { Metadata } from 'next';
import Workspace from '@/components/workspace';
export const metadata: Metadata = { title: 'Account Settings | SearchPilot' };
export default function SettingsPage() { return <Workspace section="settings"/>; }
