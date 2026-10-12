import { getApps, initializeApp } from 'firebase/app';

export function publicFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'localhost',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'fluffys-local',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  };
}

export function publicFirebaseApp() {
  const config = publicFirebaseConfig();
  if (!config.apiKey || !config.projectId) throw new Error('Firebase web config is incomplete.');
  return getApps().find((app) => app.name === 'fluffys-public') || initializeApp(config, 'fluffys-public');
}
