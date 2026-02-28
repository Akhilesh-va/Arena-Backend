import { ArticleModel, IArticle, ArticleAuthorType } from '../models/Article';
import { LikeModel } from '../models/Like';
import { SavedArticleModel } from '../models/SavedArticle';
import { CommentModel } from '../models/Comment';
import { UserModel } from '../models/User';
import { notFoundError, forbiddenError } from '../utils/errors';

export interface CreateArticleInput {
  authorId: string;
  authorType?: ArticleAuthorType;
  title: string;
  body: string;
  coverImageUrl?: string;
}

export async function createArticle(input: CreateArticleInput): Promise<IArticle> {
  const article = await ArticleModel.create({
    authorId: input.authorId,
    authorType: input.authorType || 'USER',
    title: input.title,
    body: input.body,
    coverImageUrl: input.coverImageUrl,
  });
  return article.toObject();
}

export async function getArticleById(
  articleId: string,
  currentUserId?: string
): Promise<IArticle & { authorName?: string; authorAvatarUrl?: string; isLiked?: boolean; isSaved?: boolean }> {
  const article = await ArticleModel.findById(articleId).lean();
  if (!article) throw notFoundError('Article not found');
  const author = await UserModel.findById(article.authorId)
    .select('displayName photoUrl')
    .lean();
  let isLiked = false;
  let isSaved = false;
  if (currentUserId) {
    const [like, saved] = await Promise.all([
      LikeModel.findOne({ userId: currentUserId, targetType: 'article', targetId: articleId }),
      SavedArticleModel.findOne({ userId: currentUserId, articleId }),
    ]);
    isLiked = !!like;
    isSaved = !!saved;
  }
  return {
    ...article,
    authorName: author?.displayName,
    authorAvatarUrl: author?.photoUrl,
    isLiked,
    isSaved,
  };
}

export async function getArticlesByAuthor(
  authorId: string,
  page: number,
  limit: number
): Promise<{ articles: IArticle[]; total: number }> {
  const [articles, total] = await Promise.all([
    ArticleModel.find({ authorId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ArticleModel.countDocuments({ authorId }),
  ]);
  return { articles, total };
}

export async function updateArticle(
  articleId: string,
  userId: string,
  updates: { title?: string; body?: string; coverImageUrl?: string }
): Promise<IArticle> {
  const article = await ArticleModel.findOne({ _id: articleId });
  if (!article) throw notFoundError('Article not found');
  if (article.authorId.toString() !== userId) throw forbiddenError('Not your article');
  if (updates.title !== undefined) article.title = updates.title;
  if (updates.body !== undefined) article.body = updates.body;
  if (updates.coverImageUrl !== undefined) article.coverImageUrl = updates.coverImageUrl;
  await article.save();
  return article.toObject();
}

export async function deleteArticle(articleId: string, userId: string): Promise<void> {
  const article = await ArticleModel.findOne({ _id: articleId });
  if (!article) throw notFoundError('Article not found');
  if (article.authorId.toString() !== userId) throw forbiddenError('Not your article');
  await ArticleModel.deleteOne({ _id: articleId });
  await LikeModel.deleteMany({ targetType: 'article', targetId: articleId });
  await SavedArticleModel.deleteMany({ articleId });
  await CommentModel.deleteMany({ targetType: 'article', targetId: articleId });
}

export async function likeArticle(articleId: string, userId: string): Promise<{ liked: boolean }> {
  const article = await ArticleModel.findById(articleId);
  if (!article) throw notFoundError('Article not found');
  const existing = await LikeModel.findOne({
    userId,
    targetType: 'article',
    targetId: articleId,
  });
  if (existing) {
    await LikeModel.deleteOne({ _id: existing._id });
    await ArticleModel.updateOne({ _id: articleId }, { $inc: { likeCount: -1 } });
    return { liked: false };
  }
  await LikeModel.create({ userId, targetType: 'article', targetId: articleId });
  await ArticleModel.updateOne({ _id: articleId }, { $inc: { likeCount: 1 } });
  return { liked: true };
}

export async function saveArticle(articleId: string, userId: string): Promise<{ saved: boolean }> {
  const article = await ArticleModel.findById(articleId);
  if (!article) throw notFoundError('Article not found');
  const existing = await SavedArticleModel.findOne({ userId, articleId });
  if (existing) {
    await SavedArticleModel.deleteOne({ _id: existing._id });
    return { saved: false };
  }
  await SavedArticleModel.create({ userId, articleId });
  return { saved: true };
}

export async function addComment(
  articleId: string,
  userId: string,
  text: string
): Promise<{ _id: string; authorId: string; text: string; createdAt: Date }> {
  const article = await ArticleModel.findById(articleId);
  if (!article) throw notFoundError('Article not found');
  const comment = await CommentModel.create({
    authorId: userId,
    targetType: 'article',
    targetId: articleId,
    text,
  });
  await ArticleModel.updateOne({ _id: articleId }, { $inc: { commentCount: 1 } });
  return {
    _id: comment._id.toString(),
    authorId: comment.authorId.toString(),
    text: comment.text,
    createdAt: comment.createdAt,
  };
}

export async function getComments(
  articleId: string,
  page: number,
  limit: number
): Promise<{
  comments: Array<{
    _id: string;
    text: string;
    authorId: string;
    authorName?: string;
    authorAvatarUrl?: string;
    createdAt: Date;
  }>;
  total: number;
}> {
  const [comments, total] = await Promise.all([
    CommentModel.find({ targetType: 'article', targetId: articleId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CommentModel.countDocuments({ targetType: 'article', targetId: articleId }),
  ]);
  const authorIds = [...new Set(comments.map((c) => c.authorId.toString()))];
  const authors = await UserModel.find({ _id: { $in: authorIds } })
    .select('displayName photoUrl')
    .lean();
  const authorMap = new Map(authors.map((a) => [a._id.toString(), a]));
  const commentsWithAuthor = comments.map((c) => ({
    _id: c._id.toString(),
    text: c.text,
    authorId: c.authorId.toString(),
    authorName: authorMap.get(c.authorId.toString())?.displayName,
    authorAvatarUrl: authorMap.get(c.authorId.toString())?.photoUrl,
    createdAt: c.createdAt,
  }));
  return { comments: commentsWithAuthor, total };
}
