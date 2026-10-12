import CateringBoard, { type InquiryRow, type PackageRow } from '@/components/admin/CateringBoard';
import { currentUser } from '@/lib/admin/current-user';
import { listInquiries, listPackages } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function CateringAdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const user = await currentUser();
  const packages = (await listPackages(user)) as PackageRow[];
  const inquiries = (await listInquiries(user)) as InquiryRow[];
  return (
    <CateringBoard
      packages={packages.map((item) => ({
        id: String(item.id),
        name: String(item.name),
        description: String(item.description || ''),
        pricing_note: String(item.pricing_note || ''),
        status: String(item.status),
      }))}
      inquiries={inquiries.map((item) => ({
        id: String(item.id),
        name: String(item.name),
        email: String(item.email),
        phone: String(item.phone || ''),
        event_type: String(item.event_type),
        event_date: String(item.event_date),
        guests: String(item.guests || ''),
        location: String(item.location || ''),
        details: String(item.details || ''),
        status: String(item.status),
        internal_note: String(item.internal_note || ''),
        created_at: String(item.created_at),
        notification_status: item.notification_status ? String(item.notification_status) : '',
        notification_error: item.notification_error ? String(item.notification_error) : '',
      }))}
      error={params.error}
    />
  );
}
