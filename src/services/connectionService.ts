import { ConnectionRequestModel, IConnectionRequest } from '../models/ConnectionRequest';
import { ConnectionModel, IConnection } from '../models/Connection';
import { UserModel } from '../models/User';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  notFoundError,
} from '../utils/errors';
import * as notificationService from './notificationService';
import mongoose from 'mongoose';

export type ConnectionStatusResponse =
  | 'NONE'
  | 'PENDING_SENT'
  | 'PENDING_RECEIVED'
  | 'CONNECTED'
  | 'BLOCKED';

export async function getConnectionStatus(
  currentUserId: string,
  otherUserId: string
): Promise<{ status: ConnectionStatusResponse }> {
  if (currentUserId === otherUserId) {
    return { status: 'NONE' };
  }
  const [connected, pendingSent, pendingReceived] = await Promise.all([
    areConnected(currentUserId, otherUserId),
    ConnectionRequestModel.findOne({
      fromUserId: currentUserId,
      toUserId: otherUserId,
      status: 'PENDING',
    }).lean(),
    ConnectionRequestModel.findOne({
      fromUserId: otherUserId,
      toUserId: currentUserId,
      status: 'PENDING',
    }).lean(),
  ]);
  if (connected) return { status: 'CONNECTED' };
  if (pendingSent) return { status: 'PENDING_SENT' };
  if (pendingReceived) return { status: 'PENDING_RECEIVED' };
  return { status: 'NONE' };
}

export async function createRequest(fromUserId: string, toUserId: string): Promise<{ requestId: string }> {
  if (fromUserId === toUserId) {
    throw badRequestError('Cannot send connection request to yourself');
  }
  const connected = await areConnected(fromUserId, toUserId);
  if (connected) {
    throw conflictError('Already connected');
  }
  const existingAny = await ConnectionRequestModel.findOne({
    status: 'PENDING',
    $or: [
      { fromUserId: fromUserId, toUserId: toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ],
  });
  if (existingAny) {
    throw conflictError('A pending request already exists between you and this user');
  }
  const doc = await ConnectionRequestModel.create({
    fromUserId,
    toUserId,
    status: 'PENDING',
  });

  const fromUser = await UserModel.findById(fromUserId).select('displayName photoUrl').lean();
  const fromName = fromUser?.displayName ?? 'Someone';
  await notificationService.createNotification({
    userId: toUserId,
    type: 'CONNECTION_REQUEST',
    title: `${fromName} wants to connect`,
    message: 'Tap to view the connection request',
    actorId: fromUserId,
    actorName: fromName,
    actorAvatarUrl: fromUser?.photoUrl,
    targetId: 'connections',
  });
  await notificationService.sendFcmToUser(
    toUserId,
    {
      title: `${fromName} wants to connect`,
      body: 'Tap to view the connection request',
    },
    { type: 'CONNECTION_REQUEST', targetId: 'connections' }
  );

  return { requestId: doc._id.toString() };
}

export async function acceptRequest(currentUserId: string, requestId: string): Promise<void> {
  const req = await ConnectionRequestModel.findById(requestId);
  if (!req) throw notFoundError('Request not found');
  if (req.toUserId.toString() !== currentUserId) {
    throw forbiddenError('You can only accept requests sent to you');
  }
  if (req.status !== 'PENDING') {
    return;
  }
  const fromId = req.fromUserId.toString();
  const toId = req.toUserId.toString();
  await ConnectionRequestModel.updateOne({ _id: requestId }, { $set: { status: 'ACCEPTED' } });
  await createBidirectionalConnection(fromId, toId);
}

export async function rejectRequest(currentUserId: string, requestId: string): Promise<void> {
  const req = await ConnectionRequestModel.findById(requestId);
  if (!req) throw notFoundError('Request not found');
  if (req.toUserId.toString() !== currentUserId) {
    throw forbiddenError('You can only reject requests sent to you');
  }
  await ConnectionRequestModel.updateOne({ _id: requestId }, { $set: { status: 'REJECTED' } });
}

export async function cancelRequest(currentUserId: string, requestId: string): Promise<void> {
  const req = await ConnectionRequestModel.findById(requestId);
  if (!req) throw notFoundError('Request not found');
  if (req.fromUserId.toString() !== currentUserId) {
    throw forbiddenError('You can only cancel requests you sent');
  }
  await ConnectionRequestModel.updateOne({ _id: requestId }, { $set: { status: 'REJECTED' } });
}

export async function removeConnection(
  currentUserId: string,
  connectedUserId: string
): Promise<void> {
  const connected = await areConnected(currentUserId, connectedUserId);
  if (!connected) {
    throw badRequestError('Not connected to this user');
  }
  await ConnectionModel.deleteMany({
    $or: [
      { userId: currentUserId, connectedUserId: connectedUserId },
      { userId: connectedUserId, connectedUserId: currentUserId },
    ],
  });
}

export async function getRequests(currentUserId: string): Promise<{
  received: Array<{
    id: string;
    fromUserId: string;
    toUserId: string;
    status: string;
    createdAt: string;
    fromUserName: string;
    fromUserAvatarUrl: string | null;
    fromUserBio: string | null;
  }>;
  sent: Array<{
    id: string;
    fromUserId: string;
    toUserId: string;
    status: string;
    createdAt: string;
    toUserName: string;
    toUserAvatarUrl: string | null;
    toUserBio: string | null;
  }>;
}> {
  const [receivedDocs, sentDocs] = await Promise.all([
    ConnectionRequestModel.find({ toUserId: currentUserId, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean(),
    ConnectionRequestModel.find({ fromUserId: currentUserId, status: 'PENDING' })
      .sort({ createdAt: -1 })
      .lean(),
  ]);
  const fromIds = [...new Set(receivedDocs.map((r) => r.fromUserId.toString()))];
  const toIds = [...new Set(sentDocs.map((r) => r.toUserId.toString()))];

  const allUserIds = [...new Set([...fromIds, ...toIds])];
  const users = await UserModel.find({ _id: { $in: allUserIds } })
    .select('displayName photoUrl bio')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const received = receivedDocs.map((r) => {
    const u = userMap.get(r.fromUserId.toString());
    return {
      id: r._id.toString(),
      fromUserId: r.fromUserId.toString(),
      toUserId: r.toUserId.toString(),
      status: r.status,
      createdAt: (r as IConnectionRequest & { createdAt: Date }).createdAt.toISOString(),
      fromUserName: u?.displayName ?? 'Unknown',
      fromUserAvatarUrl: u?.photoUrl ?? null,
      fromUserBio: u?.bio ?? null,
    };
  });

  const sent = sentDocs.map((r) => {
    const u = userMap.get(r.toUserId.toString());
    return {
      id: r._id.toString(),
      fromUserId: r.fromUserId.toString(),
      toUserId: r.toUserId.toString(),
      status: r.status,
      createdAt: (r as IConnectionRequest & { createdAt: Date }).createdAt.toISOString(),
      toUserName: u?.displayName ?? 'Unknown',
      toUserAvatarUrl: u?.photoUrl ?? null,
      toUserBio: u?.bio ?? null,
    };
  });

  return { received, sent };
}

export async function getConnectionsList(currentUserId: string): Promise<{
  connections: Array<{
    userId: string;
    connectedUserId: string;
    createdAt: string;
    connectedUserName: string;
    connectedUserAvatarUrl: string | null;
    connectedUserBio: string | null;
  }>;
}> {
  const docs = await ConnectionModel.find({ userId: currentUserId }).sort({ createdAt: -1 }).lean();
  const connectedIds = docs.map((d) => d.connectedUserId.toString());
  const users = await UserModel.find({ _id: { $in: connectedIds } })
    .select('displayName photoUrl bio')
    .lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const connections = docs.map((d) => {
    const id = d.connectedUserId.toString();
    const u = userMap.get(id);
    return {
      userId: currentUserId,
      connectedUserId: id,
      createdAt: (d as IConnection & { createdAt: Date }).createdAt.toISOString(),
      connectedUserName: u?.displayName ?? 'Unknown',
      connectedUserAvatarUrl: u?.photoUrl ?? null,
      connectedUserBio: u?.bio ?? null,
    };
  });
  return { connections };
}

export async function areConnected(userIdA: string, userIdB: string): Promise<boolean> {
  const count = await ConnectionModel.countDocuments({
    $or: [
      { userId: userIdA, connectedUserId: userIdB },
      { userId: userIdB, connectedUserId: userIdA },
    ],
  });
  return count > 0;
}

async function createBidirectionalConnection(userIdA: string, userIdB: string): Promise<void> {
  await ConnectionModel.insertMany([
    { userId: userIdA, connectedUserId: userIdB },
    { userId: userIdB, connectedUserId: userIdA },
  ]);
}
