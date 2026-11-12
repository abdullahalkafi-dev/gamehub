'use client';
import { Coins, Gift, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/AppShell';
import { Button, Card, Field } from '@/components/ui';
import { api, useLoginMutation, useMeQuery, useRegisterMutation } from '@/features/api/api';
import { errorMessage } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const isRegister = mode === 'register';
  const loading = loginState.isLoading || registerState.isLoading;

  // Already signed in? Go straight to the lobby.
  const { data } = useMeQuery();
  useEffect(() => {
    if (data) router.replace('/');
  }, [data, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) await register(form).unwrap();
      else await login({ email: form.email, password: form.password }).unwrap();
      dispatch(api.util.invalidateTags(['Me']));
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <div className="hidden md:block">
        <Logo />
        <h1 className="font-display mt-8 text-4xl leading-tight font-bold">
          Spin the wheel with <span className="text-gold">friends</span>, in live rooms.
        </h1>
        <ul className="mt-8 space-y-4 text-muted">
          <li className="flex items-center gap-3"><Gift className="size-5 text-gold" aria-hidden /> 100 free coins when you join</li>
          <li className="flex items-center gap-3"><Users className="size-5 text-gold" aria-hidden /> Global room or your own private table</li>
          <li className="flex items-center gap-3"><Coins className="size-5 text-gold" aria-hidden /> Demo coins only, never real money</li>
        </ul>
      </div>

      <Card className="w-full max-w-md justify-self-center p-7 sm:p-8">
        <div className="mb-6 md:hidden"><Logo /></div>
        <h2 className="font-display text-2xl font-bold">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
        <p className="mt-1 mb-6 text-muted">{isRegister ? 'Get 100 free coins to start playing.' : 'Log in to see the rooms.'}</p>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {isRegister && <Field label="Display name" autoComplete="nickname" required minLength={2} maxLength={24} value={form.displayName} onChange={set('displayName')} hint="Shown in rooms and rankings" />}
          <Field label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
          <Field
            label="Password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={form.password}
            onChange={set('password')}
            hint={isRegister ? 'At least 8 characters' : undefined}
          />
          {error && <p role="alert" className="rounded-xl bg-loss/10 px-3.5 py-2.5 text-sm text-loss">{error}</p>}
          <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full">
            {isRegister ? 'Create account' : 'Log in'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <Link href={isRegister ? '/login' : '/register'} className="font-medium text-gold hover:underline">
            {isRegister ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </Card>
    </div>
  );
}
