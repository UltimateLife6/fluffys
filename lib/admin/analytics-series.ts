export function dailyEventCounts(rows: { created_at?: string }[], from: string, to: string) {
  const counts = new Map<string, number>();
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    counts.set(localDay(cursor), 0);
  }
  for (const row of rows) {
    const created = row.created_at ? new Date(row.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) continue;
    const day = localDay(created);
    if (counts.has(day)) counts.set(day, (counts.get(day) || 0) + 1);
  }
  return [...counts.entries()].map(([label, total]) => ({ label, total }));
}

function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
