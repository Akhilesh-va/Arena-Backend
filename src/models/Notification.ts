import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'CONNECTION_REQUEST'
  | 'FOLLOWED_YOU'
  | 'LIKED_YOUR_POST'
  | 'COMMENTED_ON_YOUR_POST'
  | 'NEW_MESSAGE'
  | 'NEW_APPLICATION'
  | 'APPLICATION_STATUS_CHANGED'
  | 'ORG_POSTED_HIRING';

export interface INotification {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorAvatarUrl?: string;
  targetId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = INotification & Document;

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    actorAvatarUrl: { type: String },
    targetId: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = mongoose.model<INotification>(
  'Notification',
  NotificationSchema
);
