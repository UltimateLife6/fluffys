import { redirect } from 'next/navigation';
import Shell from '@/components/admin/Shell';
import { currentUser } from '@/lib/admin/current-user';
import '../admin.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect('/admin/login?error=Your%20session%20expired.%20Sign%20in%20again.');
  return (
    <Shell role={user.role} name={user.name}>
      {children}
    </Shell>
  );
}
