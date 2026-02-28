import { UserModel, UserDocument } from '../models/User';
import { conflictError } from '../utils/errors';
import { getFirebaseAuth } from '../config/firebase';

export interface FirebaseDecodedToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Verify the Firebase ID token with the Firebase Admin SDK only.
 * Do NOT verify this token with your own JWT secret.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseDecodedToken | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      name: decoded.name ?? undefined,
      picture: decoded.picture ?? undefined,
    };
  } catch (err) {
    console.error('Firebase verifyIdToken failed:', err);
    return null;
  }
}

/**
 * Find existing user by firebaseUid or email. Does NOT create. Use to decide if we should show sign-up.
 * When found by email (e.g. old account), links firebaseUid so future sign-ins are found by uid.
 */
export async function findUserByFirebase(
  decoded: FirebaseDecodedToken,
  autoLink: boolean = true
): Promise<UserDocument | null> {
  let user = await UserModel.findOne({ firebaseUid: decoded.uid }).select('-passwordHash');
  if (user) return user;

  if (!autoLink) return null;

  const email = (decoded.email || '').toLowerCase().trim();
  if (!email) return null;
  user = await UserModel.findOne({ email }).select('-passwordHash');
  if (user) {
    user.firebaseUid = decoded.uid;
    if (decoded.name && !user.displayName) user.displayName = decoded.name;
    if (decoded.picture) user.photoUrl = decoded.picture;
    await user.save();
    return user;
  }
  return null;
}

export interface SignUpFormFields {
  displayName?: string;
  username?: string;
  photoUrl?: string;
  age?: string;
  gender?: string;
  phoneNumber?: string;
  primaryGame?: string;
}

/**
 * Find existing user by firebaseUid or email, or create a new user from Firebase token claims.
 * Optionally pass sign-up form fields to store on create.
 * Returns the MongoDB user document (without passwordHash).
 */
export async function getOrCreateUserFromFirebase(
  decoded: FirebaseDecodedToken,
  signUpFields?: SignUpFormFields
): Promise<UserDocument | null> {
  let user = await UserModel.findOne({ firebaseUid: decoded.uid }).select('-passwordHash');
  if (user) {
    if (signUpFields) {
      if (signUpFields.displayName?.trim()) user.displayName = signUpFields.displayName.trim();
      if (signUpFields.username !== undefined) {
        const desired = signUpFields.username.trim();
        if (desired) {
          const existing = await UserModel.findOne({
            username: desired,
            _id: { $ne: user._id },
          });
          if (existing) {
            throw conflictError('Username already taken');
          }
          user.username = desired;
        }
      }
      if (signUpFields.age !== undefined) user.age = signUpFields.age?.trim() || undefined;
      if (signUpFields.gender !== undefined) user.gender = signUpFields.gender?.trim() || undefined;
      if (signUpFields.phoneNumber !== undefined) user.phoneNumber = signUpFields.phoneNumber?.trim() || undefined;
      if (signUpFields.primaryGame !== undefined) user.primaryGame = signUpFields.primaryGame?.trim() || undefined;
      await user.save();
    }
    return user;
  }

  const email = (decoded.email || `${decoded.uid}@firebase.placeholder`).toLowerCase().trim();
  user = await UserModel.findOne({ email }).select('-passwordHash');
  if (user) {
    user.firebaseUid = decoded.uid;
    if (decoded.name && !user.displayName) user.displayName = decoded.name;
    if (signUpFields?.photoUrl !== undefined) user.photoUrl = signUpFields.photoUrl?.trim() || undefined;
    else if (decoded.picture) user.photoUrl = decoded.picture;
    if (signUpFields) {
      if (signUpFields.displayName?.trim()) user.displayName = signUpFields.displayName.trim();
      if (signUpFields.username !== undefined) {
        const desired = signUpFields.username.trim();
        if (desired) {
          const existing = await UserModel.findOne({
            username: desired,
            _id: { $ne: user._id },
          });
          if (existing) {
            throw conflictError('Username already taken');
          }
          user.username = desired;
        }
      }
      if (signUpFields.age !== undefined) user.age = signUpFields.age?.trim() || undefined;
      if (signUpFields.gender !== undefined) user.gender = signUpFields.gender?.trim() || undefined;
      if (signUpFields.phoneNumber !== undefined) user.phoneNumber = signUpFields.phoneNumber?.trim() || undefined;
      if (signUpFields.primaryGame !== undefined) user.primaryGame = signUpFields.primaryGame?.trim() || undefined;
    }
    await user.save();
    return user;
  }

  const displayName =
    signUpFields?.displayName?.trim() ||
    decoded.name ||
    decoded.email?.split('@')[0] ||
    'User';

  const createDoc: Partial<UserDocument> = {
    email,
    firebaseUid: decoded.uid,
    displayName,
    photoUrl: signUpFields?.photoUrl?.trim() || decoded.picture,
    age: signUpFields?.age?.trim(),
    gender: signUpFields?.gender?.trim(),
    phoneNumber: signUpFields?.phoneNumber?.trim(),
    primaryGame: signUpFields?.primaryGame?.trim(),
    isEmailVerified: !!decoded.email,
    fcmTokens: [],
  };

  if (signUpFields?.username) {
    const desired = signUpFields.username.trim();
    if (desired) {
      const existing = await UserModel.findOne({ username: desired });
      if (existing) {
        throw conflictError('Username already taken');
      }
      (createDoc as any).username = desired;
    }
  }

  user = await UserModel.create(createDoc);
  return UserModel.findById(user._id).select('-passwordHash');
}

/**
 * Delete a user from Firebase Auth by their UID.
 */
export async function deleteFirebaseUser(uid: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await auth.deleteUser(uid);
  } catch (err) {
    console.warn(`Failed to delete Firebase user ${uid}:`, err);
    // We don't throw here to ensure DB deletion can proceed even if Firebase user is already gone or errors
  }
}
