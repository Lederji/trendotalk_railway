import { 
  users, posts, comments, likes, stories, follows,
  type User, type InsertUser, type Post, type InsertPost, 
  type Comment, type InsertComment, type Like, type Story, 
  type InsertStory, type Follow, type PostWithUser, type StoryWithUser, type UserProfile 
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Post methods
  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  getPostById(id: number): Promise<PostWithUser | undefined>;
  getPosts(isAdminOnly?: boolean): Promise<PostWithUser[]>;
  getUserPosts(userId: number): Promise<PostWithUser[]>;
  deletePost(id: number, userId: number): Promise<boolean>;
  
  // Like methods
  toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }>;
  getUserLikes(userId: number): Promise<number[]>;
  
  // Comment methods
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  getPostComments(postId: number): Promise<(Comment & { user: Pick<User, 'username' | 'avatar'> })[]>;
  
  // Story methods
  createStory(story: InsertStory & { userId: number }): Promise<Story>;
  getActiveStories(): Promise<StoryWithUser[]>;
  getUserStories(userId: number): Promise<Story[]>;
  
  // Follow methods
  followUser(followerId: number, followingId: number): Promise<boolean>;
  unfollowUser(followerId: number, followingId: number): Promise<boolean>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getUserFollowers(userId: number): Promise<User[]>;
  getUserFollowing(userId: number): Promise<User[]>;
  getSuggestedUsers(userId: number): Promise<User[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private posts: Map<number, Post> = new Map();
  private comments: Map<number, Comment> = new Map();
  private likes: Map<number, Like> = new Map();
  private stories: Map<number, Story> = new Map();
  private follows: Map<number, Follow> = new Map();
  
  private currentUserId = 1;
  private currentPostId = 1;
  private currentCommentId = 1;
  private currentLikeId = 1;
  private currentStoryId = 1;
  private currentFollowId = 1;

  constructor() {
    this.seedData();
  }

  private async seedData() {
    // Create admin user with hashed password
    const hashedAdminPassword = await bcrypt.hash("IpjDr620911@TrendoTalk", 10);
    const admin: User = {
      id: this.currentUserId++,
      username: "ipj.trendotalk",
      password: hashedAdminPassword,
      isAdmin: true,
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      bio: "Official TrendoTalk Account",
      followersCount: 10000,
      followingCount: 0,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create some sample users
    const sampleUsers = [
      {
        username: "tp-creativemind",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        bio: "Digital artist and creative enthusiast"
      },
      {
        username: "tp-techguru",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        bio: "Tech enthusiast building the future"
      },
      {
        username: "tp-explorer",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        bio: "Adventure seeker and travel lover"
      }
    ];

    // Hash password for sample users
    const hashedSamplePassword = await bcrypt.hash("password123", 10);
    
    sampleUsers.forEach(userData => {
      const user: User = {
        id: this.currentUserId++,
        username: userData.username,
        password: hashedSamplePassword,
        isAdmin: false,
        avatar: userData.avatar,
        bio: userData.bio,
        followersCount: Math.floor(Math.random() * 1000) + 100,
        followingCount: Math.floor(Math.random() * 500) + 50,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = {
      id: this.currentUserId++,
      username: insertUser.username,
      password: hashedPassword,
      isAdmin: insertUser.isAdmin || false,
      avatar: insertUser.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`,
      bio: insertUser.bio || "",
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return !Array.from(this.users.values()).some(user => user.username === username);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createPost(postData: InsertPost & { userId: number }): Promise<Post> {
    const post: Post = {
      id: this.currentPostId++,
      userId: postData.userId,
      caption: postData.caption,
      imageUrl: postData.imageUrl || null,
      videoUrl: postData.videoUrl || null,
      link: postData.link || null,
      likesCount: 0,
      commentsCount: 0,
      isAdminPost: postData.isAdminPost || false,
      createdAt: new Date(),
    };
    this.posts.set(post.id, post);
    return post;
  }

  async getPostById(id: number): Promise<PostWithUser | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    const user = await this.getUser(post.userId);
    if (!user) return undefined;
    
    return {
      ...post,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    };
  }

  async getPosts(isAdminOnly?: boolean): Promise<PostWithUser[]> {
    let filteredPosts = Array.from(this.posts.values());
    
    if (isAdminOnly !== undefined) {
      filteredPosts = filteredPosts.filter(post => post.isAdminPost === isAdminOnly);
    }
    
    // Sort by creation date (newest first)
    filteredPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const postsWithUsers: PostWithUser[] = [];
    for (const post of filteredPosts) {
      const user = await this.getUser(post.userId);
      if (user) {
        postsWithUsers.push({
          ...post,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
          },
        });
      }
    }
    
    return postsWithUsers;
  }

  async getUserPosts(userId: number): Promise<PostWithUser[]> {
    const userPosts = Array.from(this.posts.values()).filter(post => post.userId === userId);
    const user = await this.getUser(userId);
    
    if (!user) return [];
    
    return userPosts.map(post => ({
      ...post,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
    }));
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    const post = this.posts.get(id);
    if (!post || post.userId !== userId) return false;
    
    this.posts.delete(id);
    // Also delete related comments and likes
    Array.from(this.comments.entries()).forEach(([commentId, comment]) => {
      if (comment.postId === id) {
        this.comments.delete(commentId);
      }
    });
    
    Array.from(this.likes.entries()).forEach(([likeId, like]) => {
      if (like.postId === id) {
        this.likes.delete(likeId);
      }
    });
    
    return true;
  }

  async toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    const existingLike = Array.from(this.likes.values()).find(
      like => like.postId === postId && like.userId === userId
    );
    
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    
    if (existingLike) {
      // Unlike
      Array.from(this.likes.entries()).forEach(([likeId, like]) => {
        if (like.postId === postId && like.userId === userId) {
          this.likes.delete(likeId);
        }
      });
      
      post.likesCount = Math.max(0, post.likesCount - 1);
      this.posts.set(postId, post);
      return { liked: false, likesCount: post.likesCount };
    } else {
      // Like
      const like: Like = {
        id: this.currentLikeId++,
        postId,
        userId,
        createdAt: new Date(),
      };
      this.likes.set(like.id, like);
      
      post.likesCount += 1;
      this.posts.set(postId, post);
      return { liked: true, likesCount: post.likesCount };
    }
  }

  async getUserLikes(userId: number): Promise<number[]> {
    return Array.from(this.likes.values())
      .filter(like => like.userId === userId)
      .map(like => like.postId);
  }

  async createComment(commentData: InsertComment & { userId: number }): Promise<Comment> {
    const comment: Comment = {
      id: this.currentCommentId++,
      postId: commentData.postId,
      userId: commentData.userId,
      content: commentData.content,
      createdAt: new Date(),
    };
    
    this.comments.set(comment.id, comment);
    
    // Update post comments count
    const post = this.posts.get(commentData.postId);
    if (post) {
      post.commentsCount += 1;
      this.posts.set(post.id, post);
    }
    
    return comment;
  }

  async getPostComments(postId: number): Promise<(Comment & { user: Pick<User, 'username' | 'avatar'> })[]> {
    const postComments = Array.from(this.comments.values()).filter(comment => comment.postId === postId);
    
    const commentsWithUsers = [];
    for (const comment of postComments) {
      const user = await this.getUser(comment.userId);
      if (user) {
        commentsWithUsers.push({
          ...comment,
          user: {
            username: user.username,
            avatar: user.avatar,
          },
        });
      }
    }
    
    return commentsWithUsers.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createStory(storyData: InsertStory & { userId: number }): Promise<Story> {
    const story: Story = {
      id: this.currentStoryId++,
      userId: storyData.userId,
      imageUrl: storyData.imageUrl || null,
      videoUrl: storyData.videoUrl || null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    };
    
    this.stories.set(story.id, story);
    return story;
  }

  async getActiveStories(): Promise<StoryWithUser[]> {
    const now = new Date();
    const activeStories = Array.from(this.stories.values()).filter(story => story.expiresAt > now);
    
    const storiesWithUsers = [];
    for (const story of activeStories) {
      const user = await this.getUser(story.userId);
      if (user) {
        storiesWithUsers.push({
          ...story,
          user: {
            username: user.username,
            avatar: user.avatar,
          },
        });
      }
    }
    
    return storiesWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserStories(userId: number): Promise<Story[]> {
    const now = new Date();
    return Array.from(this.stories.values()).filter(
      story => story.userId === userId && story.expiresAt > now
    );
  }

  async followUser(followerId: number, followingId: number): Promise<boolean> {
    if (followerId === followingId) return false;
    
    const existingFollow = Array.from(this.follows.values()).find(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
    
    if (existingFollow) return false;
    
    const follow: Follow = {
      id: this.currentFollowId++,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    
    this.follows.set(follow.id, follow);
    
    // Update follower/following counts
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower) {
      follower.followingCount += 1;
      this.users.set(followerId, follower);
    }
    
    if (following) {
      following.followersCount += 1;
      this.users.set(followingId, following);
    }
    
    return true;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const followToRemove = Array.from(this.follows.entries()).find(
      ([_, follow]) => follow.followerId === followerId && follow.followingId === followingId
    );
    
    if (!followToRemove) return false;
    
    this.follows.delete(followToRemove[0]);
    
    // Update follower/following counts
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower) {
      follower.followingCount = Math.max(0, follower.followingCount - 1);
      this.users.set(followerId, follower);
    }
    
    if (following) {
      following.followersCount = Math.max(0, following.followersCount - 1);
      this.users.set(followingId, following);
    }
    
    return true;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      follow => follow.followerId === followerId && follow.followingId === followingId
    );
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    const followerIds = Array.from(this.follows.values())
      .filter(follow => follow.followingId === userId)
      .map(follow => follow.followerId);
    
    return followerIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    const followingIds = Array.from(this.follows.values())
      .filter(follow => follow.followerId === userId)
      .map(follow => follow.followingId);
    
    return followingIds.map(id => this.users.get(id)).filter(Boolean) as User[];
  }

  async getSuggestedUsers(userId: number): Promise<User[]> {
    const following = await this.getUserFollowing(userId);
    const followingIds = following.map(user => user.id);
    followingIds.push(userId); // Don't suggest self
    
    return Array.from(this.users.values())
      .filter(user => !followingIds.includes(user.id))
      .slice(0, 5); // Return up to 5 suggestions
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedData();
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    return !user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createPost(postData: InsertPost & { userId: number }): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values(postData)
      .returning();
    return post;
  }

  async getPostById(id: number): Promise<PostWithUser | undefined> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          isAdmin: users.isAdmin,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, id));

    if (!result[0] || !result[0].user) return undefined;

    return {
      ...result[0].post,
      user: result[0].user,
      likesCount: result[0].post.likesCount || 0,
      commentsCount: result[0].post.commentsCount || 0,
    } as PostWithUser;
  }

  async getPosts(isAdminOnly?: boolean): Promise<PostWithUser[]> {
    let query = db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          isAdmin: users.isAdmin,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id));

    if (isAdminOnly !== undefined) {
      query = query.where(eq(posts.isAdminPost, isAdminOnly));
    }

    const result = await query.orderBy(desc(posts.createdAt));

    return result
      .filter(row => row.user)
      .map((row) => ({
        ...row.post,
        user: row.user,
        likesCount: row.post.likesCount || 0,
        commentsCount: row.post.commentsCount || 0,
      } as PostWithUser));
  }

  async getUserPosts(userId: number): Promise<PostWithUser[]> {
    const result = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          isAdmin: users.isAdmin,
        },
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return result
      .filter(row => row.user)
      .map((row) => ({
        ...row.post,
        user: row.user,
        likesCount: row.post.likesCount || 0,
        commentsCount: row.post.commentsCount || 0,
      } as PostWithUser));
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    // Check if like exists
    const [existingLike] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)));

    if (existingLike) {
      // Remove like
      await db
        .delete(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
      
      // Update post likes count
      await db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} - 1` })
        .where(eq(posts.id, postId));
        
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      return { liked: false, likesCount: post?.likesCount || 0 };
    } else {
      // Add like
      await db
        .insert(likes)
        .values({ postId, userId });
      
      // Update post likes count
      await db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
        
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      return { liked: true, likesCount: post?.likesCount || 1 };
    }
  }

  async getUserLikes(userId: number): Promise<number[]> {
    const userLikes = await db
      .select({ postId: likes.postId })
      .from(likes)
      .where(eq(likes.userId, userId));
    return userLikes.map(like => like.postId);
  }

  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    const [newComment] = await db
      .insert(comments)
      .values(comment)
      .returning();
    
    // Update post comments count
    await db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, comment.postId));
      
    return newComment;
  }

  async getPostComments(postId: number): Promise<(Comment & { user: Pick<User, 'username' | 'avatar'> })[]> {
    const result = await db
      .select({
        comment: comments,
        user: {
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));

    return result.map(row => ({
      ...row.comment,
      user: row.user,
    }));
  }

  async createStory(story: InsertStory & { userId: number }): Promise<Story> {
    // Add expiration date (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const [newStory] = await db
      .insert(stories)
      .values({
        ...story,
        expiresAt,
      })
      .returning();
    return newStory;
  }

  async getActiveStories(): Promise<StoryWithUser[]> {
    const now = new Date();
    const result = await db
      .select({
        story: stories,
        user: {
          username: users.username,
          avatar: users.avatar,
        },
      })
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(sql`${stories.expiresAt} > ${now}`)
      .orderBy(desc(stories.createdAt));

    return result.map(row => ({
      ...row.story,
      user: row.user,
    }));
  }

  async getUserStories(userId: number): Promise<Story[]> {
    const result = await db
      .select()
      .from(stories)
      .where(eq(stories.userId, userId))
      .orderBy(desc(stories.createdAt));
    return result;
  }

  async followUser(followerId: number, followingId: number): Promise<boolean> {
    try {
      await db
        .insert(follows)
        .values({ followerId, followingId });
      return true;
    } catch {
      return false;
    }
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .returning();
    return result.length > 0;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return !!follow;
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
    return result.map(row => row.user);
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    const result = await db
      .select({
        user: users,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
    return result.map(row => row.user);
  }

  async getSuggestedUsers(userId: number): Promise<User[]> {
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    
    const followingIds = following.map(f => f.followingId);
    followingIds.push(userId); // Exclude self
    
    const result = await db
      .select()
      .from(users)
      .where(notInArray(users.id, followingIds))
      .limit(5);
      
    return result;
  }

  private async seedData() {
    try {
      // Check if admin user already exists
      const existingAdmin = await this.getUserByUsername("ipj.trendotalk");
      if (!existingAdmin) {
        await this.createUser({
          username: "ipj.trendotalk",
          password: "IpjDr620911@TrendoTalk",
          confirmPassword: "IpjDr620911@TrendoTalk",
          isAdmin: true,
          bio: "Official TrendoTalk Account",
          avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        });
      }
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  }
}

export const storage = new DatabaseStorage();
