import { NotificationModel, INotification, NotificationType } from '../models/Notification';
import { UserModel } from '../models/User';
import { notFoundError } from '../utils/errors';
import * as admin from 'firebase-admin';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  targetId?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<string> {
  const doc = await NotificationModel.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    actorId: input.actorId,
    actorName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    targetId: input.targetId,
  });
  return doc._id.toString();
}

export async function getNotificationsForUser(
  userId: string,
  limit: number = 50,
  before?: string
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    actor: { id: string; name: string; avatarUrl: string | null };
    targetId: string | null;
    isRead: boolean;
    createdAt: string;
  }>
> {
  const query: Record<string, unknown> = { userId };
  if (before) {
    const beforeDoc = await NotificationModel.findById(before).select('createdAt');
    if (beforeDoc) query.createdAt = { $lt: beforeDoc.createdAt };
  }
  const docs = await NotificationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => {
    const doc = d as INotification & { createdAt: Date };
    return {
      id: doc._id.toString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      actor: {
        id: doc.actorId.toString(),
        name: doc.actorName,
        avatarUrl: doc.actorAvatarUrl ?? null,
      },
      targetId: doc.targetId ?? null,
      isRead: doc.isRead,
      createdAt: doc.createdAt.toISOString(),
    };
  });
}

export async function markAsRead(notificationId: string, userId: string): Promise<void> {
  const updated = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } }
  );
  if (!updated) throw notFoundError('Notification not found');
}

export async function markAllAsRead(userId: string): Promise<void> {
  await NotificationModel.updateMany({ userId }, { $set: { isRead: true } });
}

/**
 * Send FCM push to a user's devices. No-op if no tokens or Firebase not configured.
 */
export async function sendFcmToUser(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
  const user = await UserModel.findById(userId).select('fcmTokens').lean();
  const tokens = user?.fcmTokens ?? [];
  if (tokens.length === 0) return;
  try {
    const messaging = admin.messaging();
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: data ?? {},
      android: {
        priority: 'high',
      },
    };
    const response = await messaging.sendEachForMulticast(message);
    if (response.failureCount > 0) {
      const invalid: string[] = [];
      response.responses.forEach((r, i) => {
        if (!r.success && r.error?.code === 'messaging/invalid-registration-token') {
          invalid.push(tokens[i]);
        }
      });
      if (invalid.length > 0) {
        await UserModel.updateOne(
          { _id: userId },
          { $pull: { fcmTokens: { $in: invalid } } }
        );
      }
    }
  } catch (err) {
    console.warn('FCM send failed:', err);
  }
}
