import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedPost {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export type SavedPostDocument = ISavedPost & Document;

const SavedPostSchema = new Schema<ISavedPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true }
);

SavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const SavedPostModel = mongoose.model<ISavedPost>('SavedPost', SavedPostSchema);
