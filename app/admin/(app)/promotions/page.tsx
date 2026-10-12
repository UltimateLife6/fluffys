import PromotionsBoard, { type PromotionRow } from '@/components/admin/PromotionsBoard';
import { currentUser } from '@/lib/admin/current-user';
import { listPromotions } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ error?: string; compose?: string }> }) {
  const params = await searchParams;
  const promotions = (await listPromotions(await currentUser())) as PromotionRow[];
  return (
    <PromotionsBoard
      promotions={promotions.map((item) => ({
        id: String(item.id),
        title: String(item.title),
        body: String(item.body || ''),
        href: String(item.href || ''),
        kind: String(item.kind || 'banner'),
        starts_at: item.starts_at ? String(item.starts_at) : null,
        ends_at: item.ends_at ? String(item.ends_at) : null,
        active: Number(item.active),
        status: String(item.status),
      }))}
      error={params.error}
      startOpen={params.compose === 'promo'}
    />
  );
}
