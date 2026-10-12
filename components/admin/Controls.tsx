'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="button primary" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : children}
    </button>
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
  return (
    <form
      action={action}
      className="admin-inline"
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
