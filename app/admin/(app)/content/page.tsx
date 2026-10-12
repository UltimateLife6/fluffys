import ContentEditor from '@/components/admin/ContentEditor';
import { currentUser } from '@/lib/admin/current-user';
import { readSiteDocument } from '@/lib/admin/gateway';

export const dynamic = 'force-dynamic';

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const document = await readSiteDocument(await currentUser());
  return <ContentEditor content={document.draft} updatedAt={document.updatedAt} error={params.error} />;
}
