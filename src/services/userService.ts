import { UserModel, UserDocument, IUser } from '../models/User';
import { FollowModel } from '../models/Follow';
import { ConnectionModel } from '../models/Connection';
import { notFoundError, forbiddenError, conflictError } from '../utils/errors';
import mongoose from 'mongoose';

/** Single achievement for update. */
export interface AchievementInput {
  title: string;
  description?: string;
  gameName?: string;
}

/** Allowed fields for PATCH /users/me (edit profile). */
export interface UpdateMeInput {
  displayName?: string;
  username?: string;
  photoUrl?: string;
  coverImageUrl?: string;
  bio?: string;
  region?: string;
  tagline?: string;
  achievements?: AchievementInput[];
}

// Return the current authenticated user's profile (without password hash)
export async function getMe(userId: string): Promise<UserDocument | null> {
  if (!userId) {
    return null;
  }
  return UserModel.findById(userId).select('-passwordHash');
}

export async function getUserById(
  currentUserId: string | undefined,
  targetId: string
): Promise<{ user: UserDocument; followersCount: number; followingCount: number; connectionsCount: number; isFollowing: boolean }> {
  const user = await UserModel.findById(targetId).select('-passwordHash');
  if (!user) {
    throw notFoundError('User not found');
  }
  const [followersCount, followingCount, connectionsCount, isFollowing] = await Promise.all([
    FollowModel.countDocuments({ followingId: user._id }),
    FollowModel.countDocuments({ followerId: user._id }),
    ConnectionModel.countDocuments({ userId: user._id }),
    currentUserId
      ? FollowModel.exists({ followerId: currentUserId, followingId: user._id })
      : false,
  ]);
  return {
    user,
    followersCount,
    followingCount,
    connectionsCount,
    isFollowing: !!isFollowing,
  };
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<UserDocument> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw notFoundError('User not found');
  }
  if (input.username !== undefined) {
    const trimmed = input.username.trim();
    const existing = await UserModel.findOne({
      username: trimmed,
      _id: { $ne: userId },
    });
    if (trimmed && existing) {
      throw conflictError('Username already taken');
    }
    user.username = trimmed || undefined;
  }
  if (input.displayName !== undefined) user.displayName = (input.displayName ?? '').trim() || user.displayName;
  if ('photoUrl' in input) user.photoUrl = (input.photoUrl && input.photoUrl.trim()) || undefined;
  if ('coverImageUrl' in input) user.coverImageUrl = (input.coverImageUrl && input.coverImageUrl.trim()) || undefined;
  if ('bio' in input) user.bio = (input.bio ?? '') === '' ? undefined : (input.bio ?? '').trim();
  if ('region' in input) user.region = (input.region ?? '') === '' ? undefined : (input.region ?? '').trim();
  if ('tagline' in input) user.tagline = (input.tagline ?? '') === '' ? undefined : (input.tagline ?? '').trim();
  if (input.achievements !== undefined) {
    user.achievements = (Array.isArray(input.achievements) ? input.achievements : [])
      .filter((a) => a && typeof a.title === 'string' && a.title.trim())
      .map((a) => ({
        title: (a.title as string).trim(),
        description: typeof a.description === 'string' && a.description.trim() ? (a.description as string).trim() : undefined,
        gameName: typeof a.gameName === 'string' && a.gameName.trim() ? (a.gameName as string).trim() : undefined,
      }));
  }
  await user.save();
  const updated = await UserModel.findById(userId).select('-passwordHash');
  if (!updated) throw notFoundError('User not found');
  return updated;
}

export async function addFcmToken(userId: string, token: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw notFoundError('User not found');
  if (!user.fcmTokens.includes(token)) {
    user.fcmTokens.push(token);
    await user.save();
  }
}

export async function getUsers(
  currentUserId: string,
  page: number,
  limit: number,
  search?: string
): Promise<{ users: UserDocument[]; total: number }> {
  const skip = (page - 1) * limit;
  const filter: mongoose.FilterQuery<IUser> = { _id: { $ne: currentUserId } };
  if (search && search.trim()) {
    const re = new RegExp(search.trim(), 'i');
    filter.$or = [
      { email: re },
      { displayName: re },
      { username: re },
    ];
  }
  const [users, total] = await Promise.all([
    UserModel.find(filter).select('-passwordHash').skip(skip).limit(limit).sort({ createdAt: -1 }),
    UserModel.countDocuments(filter),
  ]);
  return { users, total };
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) {
    throw forbiddenError('Cannot follow yourself');
  }
  const target = await UserModel.findById(followingId);
  if (!target) throw notFoundError('User not found');
  await FollowModel.findOneAndUpdate(
    { followerId, followingId },
    { followerId, followingId },
    { upsert: true }
  );
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await FollowModel.deleteOne({ followerId, followingId });
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await UserModel.findById(userId);
  if (!user) throw notFoundError('User not found');

  // 1. Delete from Firebase
  if (user.firebaseUid) {
    // Dynamically import to avoid circular dependency if any, though service-to-service is usually fine.
    // robustly call the service we just updated
    const { deleteFirebaseUser } = await import('./firebaseAuthService');
    await deleteFirebaseUser(user.firebaseUid);
  }

  // 2. Delete User Profile
  await UserModel.deleteOne({ _id: userId });

  // 3. Delete Follows
  await FollowModel.deleteMany({
    $or: [{ followerId: userId }, { followingId: userId }],
  });

  // Note: We might want to delete connections, posts, etc. later, but start with user identity.
}
