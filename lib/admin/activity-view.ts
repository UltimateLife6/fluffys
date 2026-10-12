export type AuditRow = {
  id: string;
  created_at: string;
  role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  before_json: string | null;
  after_json: string | null;
};

export type ActivityFilters = {
  query: string;
  action: string;
  user: string;
  from: string;
  to: string;
};

export function filterActivity(logs: AuditRow[], filters: ActivityFilters) {
  const query = filters.query.trim().toLowerCase();
  return logs.filter((log) => {
    if (filters.action && log.action !== filters.action) return false;
    if (filters.user && log.user_id !== filters.user && log.role !== filters.user) return false;
    const day = log.created_at.slice(0, 10);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;
    if (!query) return true;
    const haystack = `${log.action} ${log.entity_type} ${log.entity_id} ${log.role} ${changeSummary(log.before_json, log.after_json)}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function changeSummary(beforeJson: string | null, afterJson: string | null) {
  const before = parseRecord(beforeJson);
  const after = parseRecord(afterJson);
  if (!before && after) return 'Created';
  if (before && !after) return 'Removed';
  if (!before || !after) return 'Updated';
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [...keys].filter((key) => !secretKey(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (!changed.length) return 'No field changes';
  return changed
    .slice(0, 4)
    .map((key) => key.replaceAll('_', ' '))
    .join(', ');
}

function secretKey(key: string) {
  const name = key.toLowerCase();
  return name.includes('password') || name.includes('token') || name.includes('secret');
}

function parseRecord(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
