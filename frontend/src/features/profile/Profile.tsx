'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, Field, PageTitle, Skeleton } from '@/components/ui';
import { api, useChangePasswordMutation, useLogoutMutation, useMeQuery, useUpdateProfileMutation } from '@/features/api/api';
import { pushToast } from '@/features/ui/toastSlice';
import { errorMessage } from '@/lib/format';
import { useAppDispatch } from '@/store/hooks';

export function Profile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data } = useMeQuery();
  const [update, updateState] = useUpdateProfileMutation();
  const [changePw, pwState] = useChangePasswordMutation();
  const [logout] = useLogoutMutation();
  const [name, setName] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwError, setPwError] = useState('');

  useEffect(() => { if (data) setName(data.user.displayName); }, [data]);
  if (!data) return <Skeleton className="h-64 w-full" />;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try { await update({ displayName: name }).unwrap(); dispatch(pushToast('success', 'Name updated')); }
    catch (err) { dispatch(pushToast('error', errorMessage(err))); }
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    try { await changePw(pw).unwrap(); setPw({ currentPassword: '', newPassword: '' }); dispatch(pushToast('success', 'Password changed')); }
    catch (err) { setPwError(errorMessage(err)); }
  }
  async function signOut() {
    await logout().unwrap().catch(() => undefined);
    dispatch(api.util.resetApiState());
    router.replace('/login');
  }

  return (
    <>
      <PageTitle title="Profile" sub={data.user.email} />
      <div className="mx-auto max-w-xl space-y-5">
        <Card>
          <form onSubmit={saveName} className="space-y-4">
            <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={24} hint="Other players see this name" />
            <Button type="submit" loading={updateState.isLoading} disabled={name.trim().length < 2 || name === data.user.displayName}>Save name</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={savePw} className="space-y-4">
            <h2 className="font-display text-lg font-bold">Change password</h2>
            <Field label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            <Field label="New password" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} hint="At least 8 characters" error={pwError} />
            <Button type="submit" loading={pwState.isLoading} disabled={!pw.currentPassword || pw.newPassword.length < 8}>Change password</Button>
          </form>
        </Card>
        <Button variant="danger" className="w-full" onClick={signOut}><LogOut className="size-4" aria-hidden /> Log out</Button>
      </div>
    </>
  );
}
