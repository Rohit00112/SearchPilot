import type { Metadata } from 'next';
import AuthScreen from '@/components/ui/auth-screen';
export const metadata: Metadata = { title: 'Sign in | SearchPilot' };
export default function LoginPage() { return <AuthScreen mode="login"/>; }
