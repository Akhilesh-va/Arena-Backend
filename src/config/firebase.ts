import * as admin from 'firebase-admin';
import { env } from './env';

let firebaseApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK so we can verify ID tokens with admin.auth().verifyIdToken().
 * Uses the same Firebase project as the app (e.g. arena-e4d1c). Do NOT verify Firebase
 * tokens with your own JWT secret.
 */
export function initFirebaseAdmin(): void {
  if (firebaseApp) return;

  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) return;

  try {
    if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      firebaseApp = admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
          projectId,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        projectId,
        credential: admin.credential.applicationDefault(),
      });
    } else {
      console.warn('Firebase Admin: set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS');
      return;
    }
    console.log('Firebase Admin initialized for project', projectId);
  } catch (err) {
    console.warn('Firebase Admin init failed:', err);
  }
}

export function getFirebaseAuth(): admin.auth.Auth | null {
  if (!firebaseApp) return null;
  return admin.auth(firebaseApp);
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseAuth() !== null;
}
