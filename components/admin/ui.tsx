import type { ReactNode } from 'react';

export function AdminPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="admin-page-action">{action}</div> : null}
    </header>
  );
}

export function AdminStatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <article className="admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

const tones: Record<string, string> = {
  published: 'good',
  booked: 'good',
  available: 'good',
  active: 'good',
  contacted: 'good',
  draft: 'warn',
  reviewing: 'warn',
  quoted: 'warn',
  received: 'warn',
  email_prepared: 'warn',
  pending: 'warn',
  unavailable: 'bad',
  archived: 'muted',
  cancelled: 'bad',
  closed: 'muted',
  failed: 'bad',
  sent: 'good',
  featured: 'accent',
};

export function AdminStatusBadge({ status, children }: { status: string; children?: ReactNode }) {
  const tone = tones[status] || 'muted';
  return <span className={`admin-badge is-${tone}`}>{children || status.replaceAll('_', ' ')}</span>;
}

export function AdminEmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function AdminThumb({ src, large, alt = '' }: { src?: string | null; large?: boolean; alt?: string }) {
  return (
    <span className={large ? 'admin-thumb lg' : 'admin-thumb'}>
      {src ? (
        // Owner previews include blob URLs and existing public image paths.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : (
        <span>No photo</span>
      )}
    </span>
  );
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="admin-search">
      <span className="admin-sr">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type="search" />
    </label>
  );
}

export function AdminFilterBar({ children }: { children: ReactNode }) {
  return <div className="admin-filters">{children}</div>;
}

export function EventChart({ rows, label }: { rows: { label: string; total: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  const recorded = rows.some((row) => row.total > 0);
  if (!rows.length || !recorded) return <AdminEmptyState title="No activity in this range">Events appear here after visitors use the public website.</AdminEmptyState>;
  return (
    <div className="admin-chart" role="img" aria-label={label}>
      {rows.map((row) => (
        <div className="admin-chart-col" key={row.label}>
          <span className="admin-chart-count">{row.total}</span>
          <span className="admin-chart-bar" style={{ height: row.total ? `${Math.max(8, (row.total / max) * 100)}%` : '0%' }} />
          <span className="admin-chart-label">{row.label.slice(5)}</span>
          <span className="admin-sr">
            {row.label}: {row.total}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MetricBars({ rows, empty }: { rows: { label: string; total: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  if (!rows.length) return <p className="admin-muted">{empty}</p>;
  return (
    <div>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track" aria-hidden="true">
            <span style={{ width: `${(row.total / max) * 100}%` }} />
          </div>
          <strong>{row.total}</strong>
        </div>
      ))}
    </div>
  );
}
