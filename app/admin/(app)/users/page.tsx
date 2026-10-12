import { redirect } from 'next/navigation';
import { disableUserAction, inviteUserAction } from '@/app/admin/actions';
import { ConfirmForm, SubmitButton } from '@/components/admin/Controls';
import { currentUser } from '@/lib/admin/current-user';
import { listUsers } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await currentUser();
  if (user?.role !== 'NOCTARIS_ADMIN') redirect('/admin?denied=1');
  const params = await searchParams;
  const users = (await listUsers(user)) as { id: string; email: string; name: string; role: string; disabled: number }[];
  return (
    <>
      <h1>User management</h1>
      {params.error ? <p className="admin-error" role="alert">{params.error}</p> : null}
      <p className="admin-muted">Only Noctaris can create accounts. Owners cannot change roles.</p>
      <form className="admin-card admin-form two" action={inviteUserAction}>
        <h2>Invite an account</h2>
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Temporary password<input name="password" type="password" minLength={10} required /></label>
        <label>Role
          <select name="role" defaultValue="OWNER">
            <option value="OWNER">Owner</option>
            <option value="NOCTARIS_ADMIN">Noctaris admin</option>
          </select>
        </label>
        <SubmitButton>Create account</SubmitButton>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{account.email}</td>
                <td>{account.role}</td>
                <td>{account.disabled ? 'Disabled' : 'Active'}</td>
                <td>
                  {account.id === user.id ? 'Current account' : (
                    <ConfirmForm action={disableUserAction} message={account.disabled ? 'Enable this account?' : 'Disable this account?'}>
                      <input type="hidden" name="id" value={account.id} />
                      <input type="hidden" name="disabled" value={account.disabled ? '0' : '1'} />
                      <button className="button secondary" type="submit">{account.disabled ? 'Enable' : 'Disable'}</button>
                    </ConfirmForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
