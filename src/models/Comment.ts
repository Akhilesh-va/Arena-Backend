import mongoose, { Document, Schema } from 'mongoose';

export type CommentTargetType = 'post' | 'article';

export interface IComment {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  targetType: CommentTargetType;
  targetId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export type CommentDocument = IComment & Document;

const CommentSchema = new Schema<IComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['post', 'article'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

CommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const CommentModel = mongoose.model<IComment>('Comment', CommentSchema);
