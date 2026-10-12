'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentUser, sessionCookie } from '@/lib/admin/current-user';
import { assertCan, type Role } from '@/lib/admin/permissions';
import { bucketKey, clientAddress, originAllowed } from '@/lib/admin/security';
import { storeImage } from '@/lib/admin/storage';
import {
  authenticate,
  consumeRateLimit,
  createSession,
  destroySession,
  inviteOwner,
  recordStoredImage,
  retryInquiryNotification,
  moveCategory,
  moveMenuItem,
  publishSite,
  rollbackSite,
  saveCategory,
  saveMeasurementId,
  saveMenuItem,
  savePackage,
  savePromotion,
  saveSiteDraft,
  saveStop,
  setCategoryStatus,
  setMenuItemStatus,
  setUserDisabled,
  updateInquiry,
} from '@/lib/admin/gateway';
import type { InquiryStatus, SiteContent } from '@/lib/admin/service';

function fail(path: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

async function actor() {
  const requestHeaders = await headers();
  if (!originAllowed(requestHeaders.get('origin'), requestHeaders.get('x-forwarded-host') || requestHeaders.get('host'))) {
    throw new Error('The request was blocked.');
  }
  return currentUser();
}

export async function loginAction(formData: FormData) {
  const requestHeaders = await headers();
  if (!originAllowed(requestHeaders.get('origin'), requestHeaders.get('x-forwarded-host') || requestHeaders.get('host'))) {
    redirect('/admin/login?error=The%20request%20was%20blocked.');
  }
  if (!(await consumeRateLimit(bucketKey('login', clientAddress(requestHeaders)), 20, 15 * 60 * 1000))) {
    redirect('/admin/login?error=Too%20many%20attempts.%20Try%20again%20in%20a%20few%20minutes.');
  }
  const result = await authenticate(String(formData.get('email') || ''), String(formData.get('password') || ''));
  if (!result.ok) redirect(`/admin/login?error=${encodeURIComponent(result.error)}`);
  const session = await createSession(result.actor, result.idToken);
  const jar = await cookies();
  jar.set(sessionCookie, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  const next = String(formData.get('next') || '/admin');
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logoutAction() {
  await actor();
  const jar = await cookies();
  await destroySession(jar.get(sessionCookie)?.value);
  jar.delete(sessionCookie);
  redirect('/admin/login');
}

export async function saveCategoryAction(formData: FormData) {
  try {
    await saveCategory(await actor(), {
      id: String(formData.get('id') || '') || undefined,
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      image: String(formData.get('image') || ''),
      imageAlt: String(formData.get('imageAlt') || ''),
      imagePosition: String(formData.get('imagePosition') || ''),
    });
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function categoryStatusAction(formData: FormData) {
  try {
    await setCategoryStatus(await actor(), String(formData.get('id')), String(formData.get('status')) as 'draft' | 'published' | 'archived');
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function moveCategoryAction(formData: FormData) {
  try {
    await moveCategory(await actor(), String(formData.get('id')), Number(formData.get('direction')) === -1 ? -1 : 1);
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function saveItemAction(formData: FormData) {
  try {
    await saveMenuItem(await actor(), {
      id: String(formData.get('id') || '') || undefined,
      categoryId: String(formData.get('categoryId') || ''),
      name: String(formData.get('name') || ''),
      note: String(formData.get('note') || ''),
      price: String(formData.get('price') || ''),
      available: formData.get('available') === 'on',
      featured: formData.get('featured') === 'on',
      image: String(formData.get('image') || '') || null,
    });
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function itemStatusAction(formData: FormData) {
  try {
    await setMenuItemStatus(await actor(), String(formData.get('id')), String(formData.get('status')) as 'draft' | 'published' | 'archived');
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function moveItemAction(formData: FormData) {
  try {
    await moveMenuItem(await actor(), String(formData.get('id')), Number(formData.get('direction')) === -1 ? -1 : 1);
  } catch (error) {
    fail('/admin/menu', error);
  }
  redirect('/admin/menu');
}

export async function uploadImageAction(formData: FormData) {
  try {
    const user = await actor();
    assertCan(user, 'menu.write');
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('Choose an image.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeImage({ type: file.type, size: file.size, name: file.name, bytes });
    await recordStoredImage(user, stored);
    const target = String(formData.get('return') || '/admin/menu');
    redirect(`${target}?uploaded=${encodeURIComponent(stored.path)}`);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    fail('/admin/menu', error);
  }
}

export async function saveStopAction(formData: FormData) {
  try {
    await saveStop(await actor(), {
      id: String(formData.get('id') || '') || undefined,
      name: String(formData.get('name') || ''),
      address: String(formData.get('address') || ''),
      startsAt: String(formData.get('startsAt') || ''),
      endsAt: String(formData.get('endsAt') || ''),
      hours: String(formData.get('hours') || ''),
      visible: formData.get('visible') === 'on',
      status: String(formData.get('status') || 'draft') as 'draft' | 'published' | 'cancelled',
    });
  } catch (error) {
    fail('/admin/locations', error);
  }
  redirect('/admin/locations');
}

export async function savePackageAction(formData: FormData) {
  try {
    await savePackage(await actor(), {
      id: String(formData.get('id') || '') || undefined,
      name: String(formData.get('name') || ''),
      description: String(formData.get('description') || ''),
      pricingNote: String(formData.get('pricingNote') || ''),
      status: String(formData.get('status') || 'draft') as 'draft' | 'published' | 'archived',
    });
  } catch (error) {
    fail('/admin/catering', error);
  }
  redirect('/admin/catering');
}

export async function retryInquiryAction(formData: FormData) {
  try {
    await retryInquiryNotification(await actor(), String(formData.get('id') || ''));
  } catch (error) {
    fail('/admin/catering', error);
  }
  redirect('/admin/catering');
}

export async function updateInquiryAction(formData: FormData) {
  try {
    await updateInquiry(await actor(), String(formData.get('id')), String(formData.get('status')) as InquiryStatus, String(formData.get('note') || ''));
  } catch (error) {
    fail('/admin/catering', error);
  }
  redirect('/admin/catering');
}

export async function savePromotionAction(formData: FormData) {
  try {
    await savePromotion(await actor(), {
      id: String(formData.get('id') || '') || undefined,
      title: String(formData.get('title') || ''),
      body: String(formData.get('body') || ''),
      href: String(formData.get('href') || ''),
      kind: String(formData.get('kind') || 'banner'),
      startsAt: String(formData.get('startsAt') || ''),
      endsAt: String(formData.get('endsAt') || ''),
      active: formData.get('active') === 'on',
      status: String(formData.get('status') || 'draft') as 'draft' | 'published' | 'archived',
    });
  } catch (error) {
    fail('/admin/promotions', error);
  }
  redirect('/admin/promotions');
}

export async function saveContentAction(formData: FormData) {
  const content: SiteContent = {
    heroLine: String(formData.get('heroLine') || ''),
    heroAccent: String(formData.get('heroAccent') || ''),
    heroBody: String(formData.get('heroBody') || ''),
    aboutParagraphs: [String(formData.get('about1') || ''), String(formData.get('about2') || ''), String(formData.get('about3') || '')],
    aboutCloseTitle: String(formData.get('aboutCloseTitle') || ''),
    aboutCloseBody: String(formData.get('aboutCloseBody') || ''),
    phoneDisplay: String(formData.get('phoneDisplay') || ''),
    phoneHref: String(formData.get('phoneHref') || ''),
    email: String(formData.get('email') || ''),
    instagram: String(formData.get('instagram') || ''),
    facebook: String(formData.get('facebook') || ''),
    hoursNote: String(formData.get('hoursNote') || ''),
    doordash: String(formData.get('doordash') || ''),
    uberEats: String(formData.get('uberEats') || ''),
    grubhub: String(formData.get('grubhub') || ''),
  };
  try {
    await saveSiteDraft(await actor(), content);
    if (formData.get('intent') === 'publish') await publishSite(await actor());
  } catch (error) {
    fail('/admin/content', error);
  }
  redirect('/admin/content');
}

export async function rollbackContentAction() {
  try {
    await rollbackSite(await actor());
  } catch (error) {
    fail('/admin/content', error);
  }
  redirect('/admin/content');
}

export async function inviteUserAction(formData: FormData) {
  try {
    await inviteOwner(await actor(), {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      password: String(formData.get('password') || ''),
      role: String(formData.get('role') || 'OWNER') as Role,
    });
  } catch (error) {
    fail('/admin/users', error);
  }
  redirect('/admin/users');
}

export async function disableUserAction(formData: FormData) {
  try {
    await setUserDisabled(await actor(), String(formData.get('id')), formData.get('disabled') === '1');
  } catch (error) {
    fail('/admin/users', error);
  }
  redirect('/admin/users');
}

export async function saveSettingsAction(formData: FormData) {
  try {
    await saveMeasurementId(await actor(), String(formData.get('measurementId') || ''));
  } catch (error) {
    fail('/admin/settings', error);
  }
  redirect('/admin/settings');
}
