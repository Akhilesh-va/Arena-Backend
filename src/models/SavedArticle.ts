import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedArticle {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  articleId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export type SavedArticleDocument = ISavedArticle & Document;

const SavedArticleSchema = new Schema<ISavedArticle>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true },
  },
  { timestamps: true }
);

SavedArticleSchema.index({ userId: 1, articleId: 1 }, { unique: true });

export const SavedArticleModel = mongoose.model<ISavedArticle>('SavedArticle', SavedArticleSchema);
