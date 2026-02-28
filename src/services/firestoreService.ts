import * as admin from 'firebase-admin';
import { initFirebaseAdmin } from '../config/firebase';

// Initialize Firebase Admin (if configured) and expose Firestore instance.
export function getFirestore(): admin.firestore.Firestore | null {
  initFirebaseAdmin();
  try {
    if (!admin.apps.length) {
      return null;
    }
    return admin.firestore();
  } catch {
    return null;
  }
}

