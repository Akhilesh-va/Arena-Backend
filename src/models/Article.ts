import mongoose, { Document, Schema } from 'mongoose';

export type ArticleAuthorType = 'USER' | 'ORG';

export interface IArticle {
  _id: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorType: ArticleAuthorType;
  title: string;
  body: string;
  coverImageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ArticleDocument = IArticle & Document;

const ArticleSchema = new Schema<IArticle>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorType: { type: String, enum: ['USER', 'ORG'], default: 'USER' },
    title: { type: String, required: true },
    body: { type: String, required: true },
    coverImageUrl: { type: String },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ArticleSchema.index({ authorId: 1, createdAt: -1 });
ArticleSchema.index({ createdAt: -1 });

export const ArticleModel = mongoose.model<IArticle>('Article', ArticleSchema);
