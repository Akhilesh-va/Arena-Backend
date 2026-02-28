import { ConversationModel, IConversation } from '../models/Conversation';
import { MessageModel, IMessage } from '../models/Message';
import { ConversationReadModel } from '../models/ConversationRead';
import { UserModel } from '../models/User';
import { notFoundError, forbiddenError } from '../utils/errors';
import { areConnected } from './connectionService';
import mongoose from 'mongoose';
import { getFirestore } from './firestoreService';
import * as admin from 'firebase-admin';
import * as notificationService from './notificationService';

export interface ConversationWithParticipant {
  id: string;
  participant: { id: string; name: string; avatarUrl?: string; isOrg: boolean };
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export async function getOrCreateConversation(
  userId: string,
  otherUserId: string
): Promise<string> {
  if (userId === otherUserId) throw forbiddenError('Cannot message yourself');
  const connected = await areConnected(userId, otherUserId);
  if (!connected) throw forbiddenError('You must be connected to message this user');
  const existing = await ConversationModel.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 },
  });
  if (existing) return existing._id.toString();
  const conv = await ConversationModel.create({
    participants: [userId, otherUserId],
  });
  return conv._id.toString();
}

export async function getConversations(userId: string): Promise<ConversationWithParticipant[]> {
  const convos = await ConversationModel.find({ participants: userId })
    .sort({ lastMessageAt: -1 })
    .lean();
  const result: ConversationWithParticipant[] = [];
  for (const c of convos) {
    const otherId = c.participants.find((p) => p.toString() !== userId)!;
    const [other, read] = await Promise.all([
      UserModel.findById(otherId).select('displayName photoUrl').lean(),
      ConversationReadModel.findOne({ conversationId: c._id, userId }).lean(),
    ]);
    const lastReadAt = read?.lastReadAt?.getTime() ?? 0;
    const unreadCount = c.lastMessageSenderId?.toString() !== userId && (c.lastMessageAt?.getTime() ?? 0) > lastReadAt ? 1 : 0;
    result.push({
      id: c._id.toString(),
      participant: {
        id: otherId.toString(),
        name: other?.displayName ?? 'Unknown',
        avatarUrl: other?.photoUrl,
        isOrg: false,
      },
      lastMessage: c.lastMessageText ?? '',
      lastMessageTime: c.lastMessageAt?.getTime() ?? 0,
      unreadCount,
    });
  }
  return result;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  limit: number,
  before?: string
): Promise<{ messages: Array<IMessage & { isFromCurrentUser: boolean }>; hasMore: boolean }> {
  const conv = await ConversationModel.findById(conversationId);
  if (!conv) throw notFoundError('Conversation not found');
  if (!conv.participants.some((p) => p.toString() === userId)) {
    throw forbiddenError('Not a participant');
  }
  const query: mongoose.FilterQuery<IMessage> = { conversationId };
  if (before) {
    const beforeDate = await MessageModel.findById(before).select('createdAt');
    if (beforeDate) query.createdAt = { $lt: beforeDate.createdAt };
  }
  const messages = await MessageModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .lean();
  const hasMore = messages.length > limit;
  const list = (hasMore ? messages.slice(0, limit) : messages).reverse();
  const withFlag = list.map((m) => ({
    ...m,
    isFromCurrentUser: m.senderId.toString() === userId,
  }));
  return { messages: withFlag, hasMore };
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  text: string,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'audio'
): Promise<IMessage> {
  const conv = await ConversationModel.findById(conversationId);
  if (!conv) throw notFoundError('Conversation not found');
  if (!conv.participants.some((p) => p.toString() === userId)) {
    throw forbiddenError('Not a participant');
  }
  const otherUserId = conv.participants.find((p) => p.toString() !== userId)?.toString();
  if (otherUserId) {
    const connected = await areConnected(userId, otherUserId);
    if (!connected) throw forbiddenError('You must be connected to message this user');
  }
  const message = await MessageModel.create({
    conversationId,
    senderId: userId,
    text,
    attachmentUrl,
    attachmentType,
    readBy: [userId],
  });
  await ConversationModel.updateOne(
    { _id: conversationId },
    {
      $set: {
        lastMessageAt: message.createdAt,
        lastMessageText: text,
        lastMessageSenderId: userId,
      },
    }
  );

  // Mirror message into Firestore for real-time clients (best-effort).
  const firestore = getFirestore();
  if (firestore) {
    try {
      await firestore
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .doc(message._id.toString())
        .set({
          id: message._id.toString(),
          conversationId,
          senderId: userId,
          text,
          attachmentUrl: attachmentUrl ?? null,
          attachmentType: attachmentType ?? null,
          createdAt: message.createdAt,
          readBy: [userId],
        });
    } catch (err) {
      // Do not break messaging if Firestore mirroring fails.
      console.warn('Failed to mirror message to Firestore', err);
    }
  }

  // Create in-app + push notification for the recipient so they see
  // "sender name · latest message" even when the app is closed.
  if (otherUserId) {
    try {
      const sender = await UserModel.findById(userId).select('displayName photoUrl').lean();
      const senderName = sender?.displayName ?? 'Someone';
      const preview = text.length > 120 ? text.slice(0, 117) + '...' : text;

      // Persist notification in DB
      await notificationService.createNotification({
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: senderName,
        message: preview,
        actorId: userId,
        actorName: senderName,
        actorAvatarUrl: sender?.photoUrl ?? undefined,
        targetId: conversationId,
      });

      // Send FCM push with metadata used by the Android service.
      await notificationService.sendFcmToUser(
        otherUserId,
        {
          title: senderName,
          body: preview,
        },
        {
          type: 'NEW_MESSAGE',
          targetId: conversationId,
          title: senderName,
          message: preview,
          actorId: userId,
          actorName: senderName,
          timestamp: (message.createdAt as Date).toISOString(),
        }
      );
    } catch (err) {
      // Notifications are best-effort; don't break messaging if they fail.
      console.warn('Failed to send message notification', err);
    }
  }

  return message.toObject();
}

export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const conv = await ConversationModel.findById(conversationId);
  if (!conv) throw notFoundError('Conversation not found');
  if (!conv.participants.some((p) => p.toString() === userId)) {
    throw forbiddenError('Not a participant');
  }
  await ConversationReadModel.findOneAndUpdate(
    { conversationId, userId },
    { $set: { lastReadAt: new Date() } },
    { upsert: true }
  );
  await MessageModel.updateMany(
    { conversationId, senderId: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );

   // Mirror read status into Firestore so clients can show "seen" in real time.
   const firestore = getFirestore();
   if (firestore) {
     try {
       const snapshot = await firestore
         .collection('conversations')
         .doc(conversationId)
         .collection('messages')
         .get();

       const batch = firestore.batch();
       snapshot.docs.forEach((doc) => {
         batch.update(doc.ref, {
           readBy: admin.firestore.FieldValue.arrayUnion(userId),
         });
       });
       await batch.commit();
     } catch (err) {
       console.warn('Failed to mirror read status to Firestore', err);
     }
   }
}
