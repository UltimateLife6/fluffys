import { redirect } from 'next/navigation';
import UsersManager, { type AccountRow } from '@/components/admin/UsersManager';
import { currentUser } from '@/lib/admin/current-user';
import { listUsers } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (!user || user.role !== 'NOCTARIS_ADMIN') redirect('/admin?denied=1');
  const params = await searchParams;
  const users = (await listUsers(user)) as AccountRow[];
  return (
    <UsersManager
      users={users.map((account) => ({
        id: String(account.id),
        email: String(account.email),
        name: String(account.name),
        role: String(account.role),
        disabled: Number(account.disabled),
      }))}
      currentId={user.id}
      error={params.error}
    />
  );
}
