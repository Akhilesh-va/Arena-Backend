import { PostModel, IPost, PostType } from '../models/Post';
import { LikeModel } from '../models/Like';
import { CommentModel } from '../models/Comment';
import { UserModel } from '../models/User';
import { SavedPostModel } from '../models/SavedPost';
import { notFoundError, forbiddenError } from '../utils/errors';
import mongoose from 'mongoose';

export interface CreatePostInput {
  authorId: string;
  type: PostType;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
}

export async function createPost(input: CreatePostInput): Promise<IPost> {
  const post = await PostModel.create({
    authorId: input.authorId,
    type: input.type,
    caption: input.caption,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.thumbnailUrl,
  });
  return post.toObject();
}

export async function getPostById(
  postId: string,
  currentUserId?: string
): Promise<IPost & { author?: { _id: string; displayName: string; photoUrl?: string }; isLiked?: boolean; isSaved?: boolean }> {
  const post = await PostModel.findById(postId).lean();
  if (!post) throw notFoundError('Post not found');
  const author = await UserModel.findById(post.authorId)
    .select('displayName photoUrl')
    .lean();
  let isLiked = false;
  let isSaved = false;
  if (currentUserId) {
    const [like, saved] = await Promise.all([
      LikeModel.findOne({ userId: currentUserId, targetType: 'post', targetId: post._id }),
      SavedPostModel.findOne({ userId: currentUserId, postId: post._id }),
    ]);
    isLiked = !!like;
    isSaved = !!saved;
  }
  return {
    ...post,
    author: author
      ? { _id: author._id.toString(), displayName: author.displayName, photoUrl: author.photoUrl }
      : undefined,
    isLiked,
    isSaved,
  };
}

export async function getPostsByAuthor(
  authorId: string,
  page: number,
  limit: number,
  currentUserId?: string
): Promise<{ posts: IPost[]; total: number }> {
  const [posts, total] = await Promise.all([
    PostModel.find({ authorId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    PostModel.countDocuments({ authorId }),
  ]);
  return { posts, total };
}

export async function updatePost(
  postId: string,
  userId: string,
  updates: { caption?: string; mediaUrl?: string; thumbnailUrl?: string }
): Promise<IPost> {
  const post = await PostModel.findOne({ _id: postId });
  if (!post) throw notFoundError('Post not found');
  if (post.authorId.toString() !== userId) throw forbiddenError('Not your post');
  if (updates.caption !== undefined) post.caption = updates.caption;
  if (updates.mediaUrl !== undefined) post.mediaUrl = updates.mediaUrl;
  if (updates.thumbnailUrl !== undefined) post.thumbnailUrl = updates.thumbnailUrl;
  await post.save();
  return post.toObject();
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await PostModel.findOne({ _id: postId });
  if (!post) throw notFoundError('Post not found');
  if (post.authorId.toString() !== userId) throw forbiddenError('Not your post');
  await PostModel.deleteOne({ _id: postId });
  await LikeModel.deleteMany({ targetType: 'post', targetId: postId });
  await CommentModel.deleteMany({ targetType: 'post', targetId: postId });
  await SavedPostModel.deleteMany({ postId });
}

export async function savePost(postId: string, userId: string): Promise<{ saved: boolean }> {
  const post = await PostModel.findById(postId);
  if (!post) throw notFoundError('Post not found');
  const existing = await SavedPostModel.findOne({ userId, postId });
  if (existing) {
    await SavedPostModel.deleteOne({ _id: existing._id });
    return { saved: false };
  }
  await SavedPostModel.create({ userId, postId });
  return { saved: true };
}

export async function likePost(postId: string, userId: string): Promise<{ liked: boolean }> {
  const post = await PostModel.findById(postId);
  if (!post) throw notFoundError('Post not found');
  const existing = await LikeModel.findOne({
    userId,
    targetType: 'post',
    targetId: postId,
  });
  if (existing) {
    await LikeModel.deleteOne({ _id: existing._id });
    await PostModel.updateOne({ _id: postId }, { $inc: { likeCount: -1 } });
    return { liked: false };
  }
  await LikeModel.create({ userId, targetType: 'post', targetId: postId });
  await PostModel.updateOne({ _id: postId }, { $inc: { likeCount: 1 } });
  return { liked: true };
}

export async function addComment(
  postId: string,
  userId: string,
  text: string
): Promise<{ _id: string; authorId: string; text: string; createdAt: Date }> {
  const post = await PostModel.findById(postId);
  if (!post) throw notFoundError('Post not found');
  const comment = await CommentModel.create({
    authorId: userId,
    targetType: 'post',
    targetId: postId,
    text,
  });
  await PostModel.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });
  return {
    _id: comment._id.toString(),
    authorId: comment.authorId.toString(),
    text: comment.text,
    createdAt: comment.createdAt,
  };
}

export async function getComments(
  postId: string,
  page: number,
  limit: number
): Promise<{ comments: Array<{ _id: string; text: string; authorId: string; authorName?: string; authorAvatarUrl?: string; createdAt: Date }>; total: number }> {
  const [comments, total] = await Promise.all([
    CommentModel.find({ targetType: 'post', targetId: postId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    CommentModel.countDocuments({ targetType: 'post', targetId: postId }),
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
