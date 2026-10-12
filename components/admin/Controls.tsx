'use client';

import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AdminConfirmDialog } from '@/components/admin/Drawer';

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : children}
    </button>
  );
}

export function SaveActions({
  saveLabel,
  publishLabel = 'Publish',
  onCancel,
}: {
  saveLabel: string;
  publishLabel?: string;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="admin-form-actions">
      <button className="button secondary" type="button" onClick={onCancel} disabled={pending}>
        Cancel
      </button>
      <button className="button secondary" type="submit" name="intent" value="save" disabled={pending}>
        {pending ? 'Saving…' : saveLabel}
      </button>
      <button className="button primary" type="submit" name="intent" value="publish" disabled={pending}>
        {publishLabel}
      </button>
    </div>
  );
}

export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => void;
  message: string;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  return (
    <>
      <form
        ref={formRef}
        action={action}
        className="admin-inline"
        onSubmit={(event) => {
          if (!armed) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </form>
      {open ? (
        <AdminConfirmDialog
          title="Confirm this change"
          message={message}
          confirmLabel="Continue"
          onClose={() => setOpen(false)}
          onConfirm={() => {
            setArmed(true);
            setOpen(false);
            requestAnimationFrame(() => formRef.current?.requestSubmit());
          }}
        />
      ) : null}
    </>
  );
}
