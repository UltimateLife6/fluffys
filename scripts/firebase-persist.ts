import { firestore } from '@/lib/admin/firebase-app';

const mode = process.argv[2];
const ref = firestore().collection('siteSettings').doc('persist-check');

if (mode === 'write') {
  await ref.set({ id: 'persist-check', key: 'persist-check', value: 'kept' });
  console.log('wrote persist-check');
} else {
  const snap = await ref.get();
  if (snap.data()?.value !== 'kept') throw new Error('Emulator import did not keep the saved document.');
  console.log('persist-check kept');
}
