'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChartNoAxesCombined, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { Alert, Button, Input } from '@/components/ui';

type AuthUser = { id?: string; name?: string; email?: string };

export default function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then(async response => response.ok ? response.json() as Promise<{ user: AuthUser | null }> : { user: null })
      .then(data => { if (!cancelled && data.user) router.replace('/'); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'register' && name.trim().length < 2) { setError('Enter your full name.'); return; }
    if (password.length < 8) { setError('Password must contain at least 8 characters.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { displayName: name.trim(), email: email.trim().toLowerCase(), password } : { email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : (typeof data?.error?.message === 'string' ? data.error.message : 'Unable to sign in. Try again.'));
      router.replace('/');
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-layout">
    <section className="auth-aside" aria-label="About SearchPilot">
      <Link href="/" className="auth-brand"><span className="brand-mark"><ChartNoAxesCombined size={25}/></span> Search<span>Pilot</span></Link>
      <div className="auth-pitch"><div className="auth-eyebrow"><Sparkles size={16}/> SEARCH INTELLIGENCE</div>
        <h1>Turn search data into better decisions.</h1><p>One workspace for projects, keywords, technical audits and reporting.</p>
        <div className="auth-preview"><div><strong>SEO command center</strong><span>Projects · Rankings · Audits</span></div><div className="auth-preview-bars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><span className="auth-preview-foot">Transparent data sources and clear next steps</span></div>
      </div>
      <span className="auth-copyright">© 2026 SearchPilot</span>
    </section>
    <section className="auth-form-side"><div className="auth-form-card">
      <Link href="/" className="auth-mobile-brand">Search<span>Pilot</span></Link>
      <div className="auth-icon"><LockKeyhole size={22}/></div>
      <p className="auth-overline">{mode === 'login' ? 'WELCOME BACK' : 'LET’S GET STARTED'}</p>
      <h2>{mode === 'login' ? 'Sign in to SearchPilot' : 'Create your account'}</h2>
      <p className="auth-subtitle">{mode === 'login' ? 'Access your SEO workspace and continue where you left off.' : 'Set up your workspace to organize your SEO workflow.'}</p>
      {error && <Alert tone="error" title="Authentication failed" className="auth-error">{error}</Alert>}
      <form onSubmit={submit}>
        {mode === 'register' && <Input label="Full name" autoComplete="name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" maxLength={120}/>}
        <Input label="Email address" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" maxLength={254}/>
        <div className="auth-password"><Input label="Password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/>
          <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        <Button type="submit" variant="primary" loading={busy || checking} className="auth-submit">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={16}/></Button>
      </form>
      <p className="auth-switch">{mode === 'login' ? 'New to SearchPilot?' : 'Already have an account?'} <Link href={mode === 'login' ? '/register' : '/login'}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Link></p>
      <p className="auth-privacy">Your data belongs to your workspace. Sample insights are clearly labelled.</p>
    </div></section>
  </main>;
}
