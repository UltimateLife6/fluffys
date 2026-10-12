const sent = new Set<string>();

function clientId() {
  const key = 'fluffys-analytics-client';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export function track(name: string, metadata: Record<string, string> = {}) {
  if (typeof window === 'undefined') return;
  const fingerprint = `${name}|${window.location.pathname}|${JSON.stringify(metadata)}`;
  if (name === 'menu_view' && sent.has(fingerprint)) return;
  sent.add(fingerprint);
  const body = JSON.stringify({
    name,
    path: window.location.pathname,
    metadata,
    eventId: crypto.randomUUID(),
    clientId: clientId(),
  });
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
