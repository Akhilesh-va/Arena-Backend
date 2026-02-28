import mongoose, { Document, Schema } from 'mongoose';

export type ConnectionRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface IConnectionRequest {
  _id: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  status: ConnectionRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ConnectionRequestDocument = IConnectionRequest & Document;

const ConnectionRequestSchema = new Schema<IConnectionRequest>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

// At most one PENDING request per (fromUserId, toUserId)
ConnectionRequestSchema.index(
  { fromUserId: 1, toUserId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
ConnectionRequestSchema.index({ toUserId: 1, status: 1 });
ConnectionRequestSchema.index({ fromUserId: 1, status: 1 });

export const ConnectionRequestModel = mongoose.model<IConnectionRequest>(
  'ConnectionRequest',
  ConnectionRequestSchema
);
