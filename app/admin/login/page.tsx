import Image from 'next/image';
import { loginAction } from '@/app/admin/actions';
import { SubmitButton } from '@/components/admin/Controls';
import '../admin.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  return (
    <main className="admin-body">
      <section className="admin-card admin-login">
        <Image src="/brand/fluffys-logo-display.png" alt="Fluffy's Bistro" width={92} height={120} />
        <h1>Admin sign in</h1>
        <p className="admin-muted">Owners and Noctaris administrators can sign in here. There is no public registration.</p>
        {params.error ? (
          <p className="admin-error" role="alert">
            {params.error}
          </p>
        ) : null}
        <form className="admin-form" action={loginAction}>
          <input type="hidden" name="next" value={params.next || '/admin'} />
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <SubmitButton>Sign in</SubmitButton>
        </form>
      </section>
    </main>
  );
}
