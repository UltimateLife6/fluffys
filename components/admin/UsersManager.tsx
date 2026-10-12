'use client';

import { useRef, useState } from 'react';
import { disableUserAction, inviteUserAction } from '@/app/admin/actions';
import { ConfirmForm, SubmitButton } from '@/components/admin/Controls';
import { AdminConfirmDialog, AdminDrawer } from '@/components/admin/Drawer';
import { AdminPageHeader, AdminStatusBadge } from '@/components/admin/ui';

export type AccountRow = { id: string; email: string; name: string; role: string; disabled: number };

export default function UsersManager({ users, currentId, error }: { users: AccountRow[]; currentId: string; error?: string }) {
  const [open, setOpen] = useState(false);
  const [confirmRole, setConfirmRole] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const roleConfirmed = useRef(false);
  return (
    <>
      <AdminPageHeader
        title="User management"
        description="Only Noctaris can create accounts. Owners cannot open this page or change roles."
        action={<button className="button primary" type="button" onClick={() => setOpen(true)}>Create account</button>}
      />
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id}>
                <td data-label="Name">{account.name}</td>
                <td data-label="Email">{account.email}</td>
                <td data-label="Role"><AdminStatusBadge status={account.role === 'NOCTARIS_ADMIN' ? 'featured' : 'published'}>{account.role === 'NOCTARIS_ADMIN' ? 'Noctaris admin' : 'Owner'}</AdminStatusBadge></td>
                <td data-label="Status"><AdminStatusBadge status={account.disabled ? 'failed' : 'active'}>{account.disabled ? 'Disabled' : 'Active'}</AdminStatusBadge></td>
                <td data-label="Last login">Not recorded</td>
                <td data-label="Manage">
                  {account.id === currentId ? 'Current account' : (
                    <ConfirmForm action={disableUserAction} message={account.disabled ? 'Enable this account?' : 'Disable this account? They will be signed out.'}>
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
      {open ? (
        <AdminDrawer title="Create account" description="Choose the role now. This dashboard does not change an account’s role after it is created." onClose={() => setOpen(false)}>
          <form
            ref={formRef}
            className="admin-form"
            action={inviteUserAction}
            onSubmit={(event) => {
              const role = new FormData(event.currentTarget).get('role');
              if (role === 'NOCTARIS_ADMIN' && !roleConfirmed.current) {
                event.preventDefault();
                setConfirmRole(true);
              }
            }}
          >
            <label>Display name<input name="name" required /></label>
            <label>Email<input name="email" type="email" required /></label>
            <label>Temporary password<input name="password" type="password" minLength={10} required /></label>
            <label>Role
              <select name="role" defaultValue="OWNER">
                <option value="OWNER">Owner</option>
                <option value="NOCTARIS_ADMIN">Noctaris admin</option>
              </select>
            </label>
            <div className="admin-form-actions">
              <button className="button secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <SubmitButton>Create account</SubmitButton>
            </div>
          </form>
          {confirmRole ? (
            <AdminConfirmDialog
              title="Create a Noctaris admin?"
              message="This account will be able to manage users, settings, and the full activity log."
              confirmLabel="Create admin"
              onClose={() => setConfirmRole(false)}
              onConfirm={() => {
                roleConfirmed.current = true;
                setConfirmRole(false);
                formRef.current?.requestSubmit();
              }}
            />
          ) : null}
        </AdminDrawer>
      ) : null}
    </>
  );
}
