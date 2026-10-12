import { cookies } from 'next/headers';
import { actorFromToken } from '@/lib/admin/gateway';

export const sessionCookie = 'fluffys_admin';

export async function currentUser() {
  const jar = await cookies();
  return await actorFromToken(jar.get(sessionCookie)?.value);
}
