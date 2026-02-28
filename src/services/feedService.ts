import { PostModel } from '../models/Post';
import { ArticleModel } from '../models/Article';
import { UserModel } from '../models/User';
import { LikeModel } from '../models/Like';
import { SavedArticleModel } from '../models/SavedArticle';
import { SavedPostModel } from '../models/SavedPost';
import { FollowModel } from '../models/Follow';
import { ConnectionModel } from '../models/Connection';
import mongoose from 'mongoose';

export type FeedItemType = 'post' | 'article';

export interface FeedPostItem {
  type: 'post';
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorBio?: string;
  postType: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export interface FeedArticleItem {
  type: 'article';
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorBio?: string;
  authorType: string;
  title: string;
  body: string;
  coverImageUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export type FeedItem = FeedPostItem | FeedArticleItem;

export async function getFeed(
  currentUserId: string | undefined,
  page: number,
  limit: number
): Promise<{ items: FeedItem[]; hasMore: boolean }> {
  const followingIds = currentUserId ? await getFollowingIds(currentUserId) : [];
  const connectionIds = currentUserId ? await getConnectionIds(currentUserId) : [];
  const authorIds = currentUserId ? [new mongoose.Types.ObjectId(currentUserId), ...followingIds, ...connectionIds] : [];

  const postQuery = currentUserId
    ? { authorId: { $in: authorIds } }
    : {};
  const articleQuery = currentUserId
    ? { authorId: { $in: authorIds } }
    : {};

  const [posts, articles] = await Promise.all([
    PostModel.find(postQuery).sort({ createdAt: -1 }).limit(limit * 2).lean(),
    ArticleModel.find(articleQuery).sort({ createdAt: -1 }).limit(limit * 2).lean(),
  ]);

  const postItems: Array<{ createdAt: Date; item: FeedPostItem }> = posts.map((p) => ({
    createdAt: p.createdAt,
    item: {
      type: 'post',
      id: p._id.toString(),
      authorId: p.authorId.toString(),
      authorName: '',
      authorAvatarUrl: undefined,
      authorBio: undefined,
      postType: p.type,
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      thumbnailUrl: p.thumbnailUrl,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      isLiked: false,
      isSaved: false,
      createdAt: p.createdAt.toISOString(),
    },
  }));
  const articleItems: Array<{ createdAt: Date; item: FeedArticleItem }> = articles.map((a) => ({
    createdAt: a.createdAt,
    item: {
      type: 'article',
      id: a._id.toString(),
      authorId: a.authorId.toString(),
      authorName: '',
      authorAvatarUrl: undefined,
      authorType: a.authorType,
      title: a.title,
      body: a.body,
      coverImageUrl: a.coverImageUrl,
      likeCount: a.likeCount,
      commentCount: a.commentCount,
      isLiked: false,
      isSaved: false,
      createdAt: a.createdAt.toISOString(),
    },
  }));

  const merged = [...postItems, ...articleItems].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const paginated = merged.slice((page - 1) * limit, page * limit);

  const authorIdsToLoad = [...new Set(paginated.map((x) => x.item.authorId))];
  const authors = await UserModel.find({ _id: { $in: authorIdsToLoad } })
    .select('displayName photoUrl bio tagline')
    .lean();
  const authorMap = new Map(authors.map((a) => [a._id.toString(), a]));

  let likedPostIds: Set<string> = new Set();
  let likedArticleIds: Set<string> = new Set();
  let savedArticleIds: Set<string> = new Set();
  let savedPostIds: Set<string> = new Set();
  if (currentUserId) {
    const [postLikes, articleLikes, savedArticles, savedPosts] = await Promise.all([
      LikeModel.find({ userId: currentUserId, targetType: 'post', targetId: { $in: paginated.filter((x) => x.item.type === 'post').map((x) => x.item.id) } }).select('targetId').lean(),
      LikeModel.find({ userId: currentUserId, targetType: 'article', targetId: { $in: paginated.filter((x) => x.item.type === 'article').map((x) => x.item.id) } }).select('targetId').lean(),
      SavedArticleModel.find({ userId: currentUserId, articleId: { $in: paginated.filter((x) => x.item.type === 'article').map((x) => x.item.id) } }).select('articleId').lean(),
      SavedPostModel.find({ userId: currentUserId, postId: { $in: paginated.filter((x) => x.item.type === 'post').map((x) => x.item.id) } }).select('postId').lean(),
    ]);
    likedPostIds = new Set(postLikes.map((l) => l.targetId.toString()));
    likedArticleIds = new Set(articleLikes.map((l) => l.targetId.toString()));
    savedArticleIds = new Set(savedArticles.map((s) => s.articleId.toString()));
    savedPostIds = new Set(savedPosts.map((s) => s.postId.toString()));
  }

  const items: FeedItem[] = paginated.map(({ item }) => {
    const author = authorMap.get(item.authorId);
    if (item.type === 'post') {
      return {
        ...item,
        authorName: author?.displayName ?? '',
        authorAvatarUrl: author?.photoUrl,
        authorBio: author?.tagline ?? author?.bio,
        isLiked: likedPostIds.has(item.id),
        isSaved: savedPostIds.has(item.id),
      };
    }
    return {
      ...item,
      authorName: author?.displayName ?? '',
      authorAvatarUrl: author?.photoUrl,
      authorBio: author?.tagline ?? author?.bio,
      isLiked: likedArticleIds.has(item.id),
      isSaved: savedArticleIds.has(item.id),
    };
  });

  return {
    items,
    hasMore: merged.length > page * limit,
  };
}

async function getFollowingIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const follows = await FollowModel.find({ followerId: userId }).select('followingId').lean();
  return follows.map((f) => f.followingId);
}

async function getConnectionIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const connections = await ConnectionModel.find({ userId }).select('connectedUserId').lean();
  return connections.map((c) => c.connectedUserId);
}
