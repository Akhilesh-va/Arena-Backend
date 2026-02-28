import mongoose, { Document, Schema } from 'mongoose';

export type LikeTargetType = 'post' | 'article';

export interface ILike {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  targetType: LikeTargetType;
  targetId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export type LikeDocument = ILike & Document;

const LikeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'article'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
LikeSchema.index({ targetType: 1, targetId: 1 });

export const LikeModel = mongoose.model<ILike>('Like', LikeSchema);
