import mongoose, { Document, Schema } from 'mongoose';

export interface IConnection {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  connectedUserId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionDocument = IConnection & Document;

const ConnectionSchema = new Schema<IConnection>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    connectedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// List connections for a user; check "are A and B connected?"
ConnectionSchema.index({ userId: 1, connectedUserId: 1 }, { unique: true });
ConnectionSchema.index({ userId: 1 });

export const ConnectionModel = mongoose.model<IConnection>('Connection', ConnectionSchema);
