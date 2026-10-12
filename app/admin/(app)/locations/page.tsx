import LocationsBoard, { type StopRow } from '@/components/admin/LocationsBoard';
import { currentUser } from '@/lib/admin/current-user';
import { listStops } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function LocationsPage({ searchParams }: { searchParams: Promise<{ error?: string; compose?: string }> }) {
  const params = await searchParams;
  const stops = (await listStops(await currentUser())) as StopRow[];
  return (
    <LocationsBoard
      stops={stops.map((stop) => ({
        id: String(stop.id),
        name: String(stop.name),
        address: String(stop.address),
        starts_at: String(stop.starts_at),
        ends_at: String(stop.ends_at),
        hours: String(stop.hours || ''),
        status: String(stop.status),
        visible: Number(stop.visible),
      }))}
      error={params.error}
      startOpen={params.compose === 'stop'}
    />
  );
}
