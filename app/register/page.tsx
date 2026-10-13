import type { Metadata } from 'next';
import AuthScreen from '@/components/ui/auth-screen';
export const metadata: Metadata = { title: 'Create account | SearchPilot' };
export default function RegisterPage() { return <AuthScreen mode="register"/>; }
