import mongoose, { Document, Schema } from 'mongoose';

export type PostType = 'text' | 'image' | 'video' | 'audio';

export interface IPost {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  type: PostType;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = IPost & Document;

const PostSchema = new Schema<IPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'video', 'audio'], required: true },
    caption: { type: String },
    mediaUrl: { type: String },
    thumbnailUrl: { type: String },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

export const PostModel = mongoose.model<IPost>('Post', PostSchema);
