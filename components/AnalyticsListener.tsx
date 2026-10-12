'use client';

import { useEffect } from 'react';
import { track } from '@/lib/track';

const fields: Record<string, string> = {
  'data-item-id': 'itemId',
  'data-category': 'category',
  'data-provider': 'provider',
  'data-promotion-id': 'promotionId',
  'data-stop-id': 'stopId',
};

export default function AnalyticsListener() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const source = target.closest('[data-track]');
      if (!(source instanceof HTMLElement)) return;
      const name = source.dataset.track;
      if (!name) return;
      const metadata: Record<string, string> = {};
      for (const [attribute, key] of Object.entries(fields)) {
        const value = source.getAttribute(attribute);
        if (value) metadata[key] = value;
      }
      track(name, metadata);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
