import { 
  users, posts, comments, likes, dislikes, votes, stories, follows, friendRequests, chats, messages, notifications,
  type User, type InsertUser, type Post, type InsertPost, 
  type Comment, type InsertComment, type Like, type Dislike, type Vote, type Story, 
  type InsertStory, type Follow, type PostWithUser, type StoryWithUser, type UserProfile 
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq, and, desc, sql, notInArray, or, ilike } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  checkUsernameAvailability(username: string): Promise<boolean>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Post editing
  updatePost(id: number, userId: number, updates: Partial<Post>): Promise<Post | undefined>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllPosts(): Promise<Post[]>;
  getAllPostsForAdmin(): Promise<PostWithUser[]>;
  banUser(userId: number, reason: string): Promise<boolean>;
  unbanUser(userId: number): Promise<boolean>;
  verifyUser(userId: number): Promise<boolean>;
  deleteUser(userId: number): Promise<boolean>;
  adminDeletePost(postId: number): Promise<boolean>;
  sendAdminMessage(userId: number, message: string, fromAdminId: number): Promise<boolean>;
  sendBroadcastNotification(message: string, userIds?: number[]): Promise<boolean>;
  getUserActivityLogs(userId: number): Promise<any[]>;
  updateAppSettings(settings: any): Promise<boolean>;
  getReportedContent(): Promise<any[]>;
  
  // Post methods
  createPost(post: InsertPost & { userId: number }): Promise<Post>;
  getPostById(id: number): Promise<PostWithUser | undefined>;
  getPosts(isAdminOnly?: boolean): Promise<PostWithUser[]>;
  getUserPosts(userId: number): Promise<PostWithUser[]>;
  deletePost(id: number, userId: number): Promise<boolean>;
  
  // Like methods
  toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }>;
  toggleDislike(postId: number, userId: number): Promise<{ disliked: boolean; dislikesCount: number }>;
  toggleVote(postId: number, userId: number): Promise<{ voted: boolean; votesCount: number }>;
  getUserLikes(userId: number): Promise<number[]>;
  
  // Comment methods
  createComment(comment: InsertComment & { userId: number }): Promise<Comment>;
  getPostComments(postId: number): Promise<(Comment & { user: Pick<User, 'username' | 'avatar'> })[]>;
  
  // Story methods
  createStory(story: InsertStory & { userId: number; expiresAt?: Date }): Promise<Story>;
  getActiveStories(): Promise<StoryWithUser[]>;
  getUserStories(userId: number): Promise<Story[]>;
  
  // Follow methods
  followUser(followerId: number, followingId: number): Promise<boolean>;
  unfollowUser(followerId: number, followingId: number): Promise<boolean>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getUserFollowers(userId: number): Promise<User[]>;
  getUserFollowing(userId: number): Promise<User[]>;
  getSuggestedUsers(userId: number): Promise<User[]>;
  
  // Notification methods
  createNotification(userId: number, type: string, message: string, fromUserId?: number, postId?: number): Promise<void>;
  getUserNotifications(userId: number): Promise<any[]>;
  markNotificationAsRead(notificationId: number): Promise<boolean>;
  
  // Search methods
  searchUsers(query: string): Promise<User[]>;
  searchPosts(query: string): Promise<PostWithUser[]>;
  
  // Friend request methods
  sendFriendRequest(fromUserId: number, toUserId: number): Promise<boolean>;
  getFriendRequests(userId: number): Promise<any[]>;
  acceptFriendRequest(requestId: number, userId: number): Promise<boolean>;
  rejectFriendRequest(requestId: number, userId: number): Promise<boolean>;
  
  // Chat methods
  getUserChats(userId: number): Promise<any[]>;
  sendMessage(chatId: number, senderId: number, message: string): Promise<any>;
}

export class MemStorage implements IStorage {
  public users: Map<number, User> = new Map();
  public posts: Map<number, Post> = new Map();
  private comments: Map<number, Comment> = new Map();
  private likes: Map<number, Like> = new Map();
  private stories: Map<number, Story> = new Map();
  private follows: Map<number, Follow> = new Map();
  private friendRequests: Map<number, any> = new Map();
  private chats: Map<number, any> = new Map();
  
  private currentUserId = 1;
  private currentPostId = 1;
  private currentCommentId = 1;
  private currentLikeId = 1;
  private currentStoryId = 1;
  private currentFollowId = 1;
  private currentFriendRequestId = 1;
  private currentChatId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create admin user with pre-hashed password
    const admin: User = {
      id: this.currentUserId++,
      username: "ipj.trendotalk",
      password: "$2b$10$ArRSRqxl3oWTY4IuFN6iIOt5tZB1HHO1RNdFc1r6aZJBpMR.7zNpO", // IpjDr620911@TrendoTalk
      bio: "Official TrendoTalk Account",
      isAdmin: true,
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      followersCount: 10000,
      followingCount: 0,
      createdAt: new Date(),
    };
    this.users.set(admin.id, admin);

    // Create sample users with pre-hashed password
    const sampleUsers = [
      {
        username: "tp-firstuser",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
        bio: "First user account"
      },
      {
        username: "tp-leader",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        bio: "Team leader account"
      },
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

    // Pre-hashed password for "password123"
    const hashedSamplePassword = "$2b$10$E0b4Eowzbl61x7ipLzgejOQnzQIry/uIMSRcnAXj9FyIw2uiYx132";
    
    sampleUsers.forEach(userData => {
      const user: User = {
        id: this.currentUserId++,
        username: userData.username,
        password: hashedSamplePassword,
        bio: userData.bio,
        isAdmin: false,
        avatar: userData.avatar,
        followersCount: Math.floor(Math.random() * 1000) + 100,
        followingCount: Math.floor(Math.random() * 500) + 50,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
    });
    
    // Create sample posts
    this.createSamplePosts();
    
    // Create sample stories
    this.createSampleStories();
    
    // Create sample chats
    this.createSampleChats();
  }
  
  private createSamplePosts() {
    const samplePosts = [
      {
        title: "Welcome to TrendoTalk!",
        content: "Join our amazing community and start sharing your thoughts with the world. Experience the future of social media with our innovative features.",
        mediaUrl: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        userId: 1
      },
      {
        title: "Creative Design Inspiration",
        content: "Exploring new horizons in digital art and creative expression. What inspires your creativity today?",
        mediaUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        userId: 2
      },
      {
        title: "Tech Innovation",
        content: "The future of technology is here! Sharing insights about the latest developments in AI and machine learning.",
        mediaUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        userId: 3
      },
      {
        title: "Adventure Awaits",
        content: "Just returned from an amazing hiking trip! Nature has so much to offer when we take the time to explore.",
        mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        userId: 4
      },
      {
        title: "Community Building",
        content: "Building meaningful connections in our digital age. How do you connect with others in your community?",
        mediaUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        userId: 5
      }
    ];
    
    samplePosts.forEach(postData => {
      const post: Post = {
        id: this.currentPostId++,
        userId: postData.userId,
        title: postData.title,
        content: postData.content,
        mediaUrl: postData.mediaUrl,
        mediaType: 'image',
        likesCount: Math.floor(Math.random() * 100) + 10,
        dislikesCount: Math.floor(Math.random() * 10),
        votesCount: Math.floor(Math.random() * 50) + 5,
        commentsCount: Math.floor(Math.random() * 20) + 2,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))
      };
      this.posts.set(post.id, post);
    });
  }
  
  private createSampleStories() {
    const stories = [
      {
        userId: 2,
        imageUrl: "https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
        title: "Morning Coffee"
      },
      {
        userId: 3,
        imageUrl: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
        title: "Workspace Setup"
      },
      {
        userId: 4,
        imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=400",
        title: "Mountain View"
      }
    ];
    
    stories.forEach(storyData => {
      const story: Story = {
        id: this.currentStoryId++,
        userId: storyData.userId,
        imageUrl: storyData.imageUrl,
        videoUrl: null,
        title: storyData.title,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };
      this.stories.set(story.id, story);
    });
  }
  
  private createSampleChats() {
    // Create follows between users for chat functionality
    const follows = [
      { followerId: 2, followingId: 3 },
      { followerId: 3, followingId: 2 },
      { followerId: 2, followingId: 4 },
      { followerId: 4, followingId: 2 }
    ];
    
    follows.forEach(followData => {
      const follow: Follow = {
        id: this.currentFollowId++,
        followerId: followData.followerId,
        followingId: followData.followingId,
        createdAt: new Date()
      };
      this.follows.set(follow.id, follow);
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

  async updatePost(id: number, userId: number, updates: Partial<Post>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;
    
    // Allow admin to edit any post, or user to edit their own post
    const user = this.users.get(userId);
    if (!user || (!user.isAdmin && post.userId !== userId)) return undefined;
    
    const updatedPost = { ...post, ...updates };
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async createPost(postData: InsertPost & { userId: number }): Promise<Post> {
    const post: Post = {
      id: this.currentPostId++,
      userId: postData.userId,
      caption: postData.caption || null,
      imageUrl: postData.imageUrl || null,
      videoUrl: postData.videoUrl || null,
      link: postData.link || null,
      likesCount: 0,
      dislikesCount: 0,
      votesCount: 0,
      commentsCount: 0,
      isAdminPost: postData.isAdminPost || false,
      // Admin post fields
      title: postData.title || null,
      rank: postData.rank || null,
      otherRank: postData.otherRank || null,
      category: postData.category || null,
      type: postData.type || null,
      detailsLink: postData.detailsLink || null,
      video1Url: postData.video1Url || null,
      video2Url: postData.video2Url || null,
      video3Url: postData.video3Url || null,
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
    if (!post) return false;
    
    // Allow admin to delete any post, or user to delete their own post
    const user = this.users.get(userId);
    if (!user || (!user.isAdmin && post.userId !== userId)) return false;
    
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
      like => like.postId === postId && like.userId === userId && like.type === 'like'
    );
    
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    
    if (existingLike) {
      // Unlike
      this.likes.delete(existingLike.id);
      post.likesCount = Math.max(0, post.likesCount - 1);
      this.posts.set(postId, post);
      return { liked: false, likesCount: post.likesCount };
    } else {
      // Like
      const like: Like = {
        id: this.currentLikeId++,
        postId,
        userId,
        type: 'like',
        createdAt: new Date(),
      };
      this.likes.set(like.id, like);
      
      post.likesCount += 1;
      this.posts.set(postId, post);
      return { liked: true, likesCount: post.likesCount };
    }
  }

  async toggleDislike(postId: number, userId: number): Promise<{ disliked: boolean; dislikesCount: number }> {
    const existingDislike = Array.from(this.likes.values()).find(
      like => like.postId === postId && like.userId === userId && like.type === 'dislike'
    );
    
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    
    if (existingDislike) {
      this.likes.delete(existingDislike.id);
      post.dislikesCount = Math.max(0, (post.dislikesCount || 0) - 1);
      this.posts.set(postId, post);
      return { disliked: false, dislikesCount: post.dislikesCount || 0 };
    } else {
      const dislike: Like = {
        id: this.currentLikeId++,
        postId,
        userId,
        type: 'dislike',
        createdAt: new Date(),
      };
      this.likes.set(dislike.id, dislike);
      
      post.dislikesCount = (post.dislikesCount || 0) + 1;
      this.posts.set(postId, post);
      return { disliked: true, dislikesCount: post.dislikesCount };
    }
  }

  async toggleVote(postId: number, userId: number): Promise<{ voted: boolean; votesCount: number }> {
    const existingVote = Array.from(this.likes.values()).find(
      like => like.postId === postId && like.userId === userId && like.type === 'vote'
    );
    
    const post = this.posts.get(postId);
    if (!post) throw new Error("Post not found");
    
    if (existingVote) {
      this.likes.delete(existingVote.id);
      post.votesCount = Math.max(0, (post.votesCount || 0) - 1);
      this.posts.set(postId, post);
      return { voted: false, votesCount: post.votesCount || 0 };
    } else {
      const vote: Like = {
        id: this.currentLikeId++,
        postId,
        userId,
        type: 'vote',
        createdAt: new Date(),
      };
      this.likes.set(vote.id, vote);
      
      post.votesCount = (post.votesCount || 0) + 1;
      this.posts.set(postId, post);
      return { voted: true, votesCount: post.votesCount };
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

  async createStory(storyData: InsertStory & { userId: number; expiresAt?: Date }): Promise<Story> {
    const story: Story = {
      id: this.currentStoryId++,
      userId: storyData.userId,
      imageUrl: storyData.imageUrl || null,
      videoUrl: storyData.videoUrl || null,
      title: storyData.title || null,
      createdAt: new Date(),
      expiresAt: storyData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
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

  async createNotification(userId: number, type: string, message: string, fromUserId?: number, postId?: number): Promise<void> {
    // In-memory implementation doesn't persist notifications
    // You could extend this to store in memory if needed
  }

  async getUserNotifications(userId: number): Promise<any[]> {
    // Return empty array for in-memory implementation
    return [];
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    // Return true for in-memory implementation
    return true;
  }

  async searchUsers(query: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  async sendFriendRequest(fromUserId: number, toUserId: number): Promise<boolean> {
    try {
      // Check if request already exists
      const existingRequest = Array.from(this.friendRequests.values()).find(
        req => req.fromUserId === fromUserId && req.toUserId === toUserId && req.status === 'pending'
      );
      
      if (existingRequest) {
        return false; // Request already exists
      }
      
      // Create new friend request
      const friendRequest = {
        id: this.currentFriendRequestId++,
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: new Date()
      };
      
      this.friendRequests.set(friendRequest.id, friendRequest);
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    try {
      const requests = Array.from(this.friendRequests.values())
        .filter(req => req.toUserId === userId && req.status === 'pending')
        .map(req => {
          const fromUser = this.users.get(req.fromUserId);
          return {
            id: req.id,
            fromUserId: req.fromUserId,
            status: req.status,
            createdAt: req.createdAt,
            user: {
              id: fromUser?.id,
              username: fromUser?.username,
              avatar: fromUser?.avatar
            }
          };
        });
      
      return requests;
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  }

  async acceptFriendRequest(requestId: number, userId: number): Promise<boolean> {
    try {
      const request = this.friendRequests.get(requestId);
      if (!request || request.toUserId !== userId || request.status !== 'pending') {
        return false;
      }
      
      // Create mutual follow relationship
      const follow1 = {
        id: this.currentFollowId++,
        followerId: request.fromUserId,
        followingId: request.toUserId,
        createdAt: new Date()
      };
      
      const follow2 = {
        id: this.currentFollowId++,
        followerId: request.toUserId,
        followingId: request.fromUserId,
        createdAt: new Date()
      };
      
      this.follows.set(follow1.id, follow1);
      this.follows.set(follow2.id, follow2);
      
      // Create chat between users
      const chat = {
        id: this.currentChatId++,
        user1Id: Math.min(request.fromUserId, request.toUserId),
        user2Id: Math.max(request.fromUserId, request.toUserId),
        createdAt: new Date(),
        messages: []
      };
      
      this.chats.set(chat.id, chat);
      
      // Update request status
      request.status = 'accepted';
      this.friendRequests.set(requestId, request);
      
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async rejectFriendRequest(requestId: number, userId: number): Promise<boolean> {
    try {
      const request = this.friendRequests.get(requestId);
      if (!request || request.toUserId !== userId || request.status !== 'pending') {
        return false;
      }
      
      // Update request status
      request.status = 'rejected';
      this.friendRequests.set(requestId, request);
      
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return false;
    }
  }

  async getUserChats(userId: number): Promise<any[]> {
    try {
      const userChats = Array.from(this.chats.values())
        .filter(chat => chat.user1Id === userId || chat.user2Id === userId)
        .map(chat => {
          const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
          const otherUser = this.users.get(otherUserId);
          
          return {
            id: chat.id,
            user: {
              id: otherUser?.id,
              username: otherUser?.username,
              avatar: otherUser?.avatar
            },
            lastMessage: chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1] : null,
            createdAt: chat.createdAt
          };
        });
      
      return userChats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  async sendMessage(chatId: number, senderId: number, message: string): Promise<any> {
    try {
      const chat = this.chats.get(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }
      
      const newMessage = {
        id: Date.now(), // Simple ID generation
        senderId,
        message,
        createdAt: new Date()
      };
      
      chat.messages = chat.messages || [];
      chat.messages.push(newMessage);
      this.chats.set(chatId, chat);
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    const posts = Array.from(this.posts.values());
    const filteredPosts = posts.filter(post => 
      post.title?.toLowerCase().includes(query.toLowerCase()) ||
      post.caption?.toLowerCase().includes(query.toLowerCase())
    );
    
    const postsWithUsers = await Promise.all(
      filteredPosts.map(async (post) => {
        const user = await this.getUser(post.userId);
        return {
          ...post,
          user: {
            id: user!.id,
            username: user!.username,
            avatar: user!.avatar,
            isAdmin: user!.isAdmin
          }
        } as PostWithUser;
      })
    );
    
    return postsWithUsers;
  }

  // Admin methods implementation
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllPosts(): Promise<Post[]> {
    return Array.from(this.posts.values());
  }

  async getAllPostsForAdmin(): Promise<PostWithUser[]> {
    const posts = Array.from(this.posts.values());
    const postsWithUsers = await Promise.all(
      posts.map(async (post) => {
        const user = await this.getUser(post.userId);
        return {
          ...post,
          content: post.caption || post.title || '',
          user: {
            id: user!.id,
            username: user!.username,
            avatar: user!.avatar,
            isAdmin: user!.isAdmin
          }
        } as PostWithUser;
      })
    );
    
    return postsWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async banUser(userId: number, reason: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, isBanned: true, banReason: reason };
    this.users.set(userId, updatedUser);
    return true;
  }

  async unbanUser(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, isBanned: false, banReason: undefined };
    this.users.set(userId, updatedUser);
    return true;
  }

  async verifyUser(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    const updatedUser = { ...user, isVerified: true };
    this.users.set(userId, updatedUser);
    return true;
  }

  async deleteUser(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Delete user's posts
    Array.from(this.posts.entries()).forEach(([postId, post]) => {
      if (post.userId === userId) {
        this.posts.delete(postId);
      }
    });
    
    // Delete user's comments
    Array.from(this.comments.entries()).forEach(([commentId, comment]) => {
      if (comment.userId === userId) {
        this.comments.delete(commentId);
      }
    });
    
    // Delete user's likes
    Array.from(this.likes.entries()).forEach(([likeId, like]) => {
      if (like.userId === userId) {
        this.likes.delete(likeId);
      }
    });
    
    // Delete user
    this.users.delete(userId);
    return true;
  }

  async adminDeletePost(postId: number): Promise<boolean> {
    const post = this.posts.get(postId);
    if (!post) return false;
    
    // Delete related comments and likes
    Array.from(this.comments.entries()).forEach(([commentId, comment]) => {
      if (comment.postId === postId) {
        this.comments.delete(commentId);
      }
    });
    
    Array.from(this.likes.entries()).forEach(([likeId, like]) => {
      if (like.postId === postId) {
        this.likes.delete(likeId);
      }
    });
    
    this.posts.delete(postId);
    return true;
  }

  async sendAdminMessage(userId: number, message: string, fromAdminId: number): Promise<boolean> {
    // In memory implementation - would store in messages table in real app
    return true;
  }

  async sendBroadcastNotification(message: string, userIds?: number[]): Promise<boolean> {
    // In memory implementation - would send push notifications in real app
    return true;
  }

  async getUserActivityLogs(userId: number): Promise<any[]> {
    // In memory implementation - would track user activities in real app
    return [];
  }

  async updateAppSettings(settings: any): Promise<boolean> {
    // In memory implementation - would store in settings table in real app
    return true;
  }

  async getReportedContent(): Promise<any[]> {
    // In memory implementation - would return reported posts/users in real app
    return [];
  }
}



// Add video expiration and cleanup functionality
export interface IVideoCleanup {
  cleanupExpiredVideos(): Promise<void>;
  deleteVideoFromCloudinary(url: string): Promise<void>;
}

export class VideoCleanupService implements IVideoCleanup {
  async cleanupExpiredVideos(): Promise<void> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Get all video posts older than 3 days from MemStorage
    const memStorage = storage as MemStorage;
    const allPosts = Array.from(memStorage.posts.values());
    const oldVideos = allPosts.filter(post => 
      post.videoUrl && 
      new Date(post.createdAt) < threeDaysAgo
    );

    // Group by user to keep top 3 most viewed videos per user
    const userVideos = new Map<number, Post[]>();
    
    for (const video of oldVideos) {
      if (!userVideos.has(video.userId)) {
        userVideos.set(video.userId, []);
      }
      userVideos.get(video.userId)!.push(video);
    }

    // Process each user's videos
    for (const [userId, videos] of Array.from(userVideos.entries())) {
      // Sort by likes count (most viewed) and keep top 3
      videos.sort((a: Post, b: Post) => (b.likesCount || 0) - (a.likesCount || 0));
      const videosToDelete = videos.slice(3); // Delete all except top 3

      for (const video of videosToDelete) {
        try {
          // Delete from Cloudinary
          if (video.videoUrl) {
            await this.deleteVideoFromCloudinary(video.videoUrl);
          }
          
          // Delete from MemStorage
          storage.posts.delete(video.id);
        } catch (error) {
          console.error(`Failed to delete video ${video.id}:`, error);
        }
      }
    }
  }

  async deleteVideoFromCloudinary(url: string): Promise<void> {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = url.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = `trendotalk/${publicIdWithExtension.split('.')[0]}`;
      
      const cloudinary = require('cloudinary').v2;
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    } catch (error) {
      console.error('Cloudinary deletion error:', error);
    }
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Ensure tables exist before seeding data
      await this.createTablesIfNotExists();
      await this.seedData();
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }

  private async createTablesIfNotExists() {
    try {
      // Create users table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255),
          bio TEXT,
          website VARCHAR(255),
          phone VARCHAR(255),
          email VARCHAR(255),
          avatar VARCHAR(255),
          is_admin BOOLEAN DEFAULT false,
          followers_count INTEGER DEFAULT 0,
          following_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add missing columns if they don't exist for Render deployment
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
      `);

      // Create other tables
      await db.execute(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          caption TEXT,
          image_url VARCHAR(255),
          video_url VARCHAR(255),
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS likes (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS stories (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          image_url VARCHAR(255),
          video_url VARCHAR(255),
          caption TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS follows (
          id SERIAL PRIMARY KEY,
          follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(follower_id, following_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS friend_requests (
          id SERIAL PRIMARY KEY,
          from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(from_user_id, to_user_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS chats (
          id SERIAL PRIMARY KEY,
          user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user1_id, user2_id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create dislikes table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS dislikes (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
      `);

      // Create votes table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS votes (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(post_id, user_id)
        );
      `);

      // Create notifications table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(insertUser.password, 10);
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          password: hashedPassword,
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    try {
      const user = await this.getUserByUsername(username);
      return !user;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      return user || undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async createPost(postData: any): Promise<Post> {
    try {
      // Handle both old and new post formats
      const insertData = {
        userId: postData.userId,
        title: postData.title || null,
        caption: postData.caption || null,
        imageUrl: postData.imageUrl || null,
        videoUrl: postData.videoUrl || null,
        video1Url: postData.video1Url || null,
        video2Url: postData.video2Url || null,
        video3Url: postData.video3Url || null,
        rank: postData.rank || null,
        otherRank: postData.otherRank || null,
        category: postData.category || null,
        type: postData.type || null,
        detailsLink: postData.detailsLink || null,
        link: postData.link || null,
        isAdminPost: postData.isAdminPost || false,
      };

      const [post] = await db
        .insert(posts)
        .values(insertData)
        .returning();
      return post;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  async getPostById(id: number): Promise<PostWithUser | undefined> {
    try {
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
      } as PostWithUser;
    } catch (error) {
      console.error('Error getting post by id:', error);
      return undefined;
    }
  }

  async getPosts(isAdminOnly?: boolean): Promise<PostWithUser[]> {
    try {
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
        .filter(row => {
          // Only show posts that have videos (admin posts) or images/videos (regular posts)
          const post = row.post;
          return post.video1Url || post.video2Url || post.video3Url || post.videoUrl || post.imageUrl;
        })
        .map((row) => ({
          ...row.post,
          user: row.user,
        } as PostWithUser));
    } catch (error) {
      console.error('Error getting posts:', error);
      return [];
    }
  }

  async getUserPosts(userId: number): Promise<PostWithUser[]> {
    try {
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
        } as PostWithUser));
    } catch (error) {
      console.error('Error getting user posts:', error);
      return [];
    }
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(posts)
        .where(and(eq(posts.id, id), eq(posts.userId, userId)))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Check for existing like
      const [existingLike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'like')));

      // Check for existing dislike (for mutual exclusivity)
      const [existingDislike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'dislike')));

      if (existingLike) {
        // Remove like
        await db
          .delete(likes)
          .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'like')));
        
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} - 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        return { liked: false, likesCount: post?.likesCount || 0 };
      } else {
        // Remove dislike if exists (mutual exclusivity)
        if (existingDislike) {
          await db
            .delete(likes)
            .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'dislike')));
          
          await db
            .update(posts)
            .set({ dislikesCount: sql`${posts.dislikesCount} - 1` })
            .where(eq(posts.id, postId));
        }

        // Add like
        await db
          .insert(likes)
          .values({ postId, userId, type: 'like', createdAt: new Date() });
        
        await db
          .update(posts)
          .set({ likesCount: sql`${posts.likesCount} + 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        
        // Create notification for post owner (if not self-like)
        if (post && post.userId !== userId) {
          const [liker] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId));
          
          if (liker) {
            try {
              await this.createNotification(
                post.userId,
                'like',
                `${liker.username} liked your post`,
                userId,
                postId
              );
            } catch (notifError) {
              console.error('Error creating notification:', notifError);
            }
          }
        }
        
        return { liked: true, likesCount: post?.likesCount || 1 };
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return { liked: false, likesCount: 0 };
    }
  }

  async toggleDislike(postId: number, userId: number): Promise<{ disliked: boolean; dislikesCount: number }> {
    try {
      // Check for existing dislike
      const [existingDislike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'dislike')));

      // Check for existing like (for mutual exclusivity)
      const [existingLike] = await db
        .select()
        .from(likes)
        .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'like')));

      if (existingDislike) {
        // Remove dislike
        await db
          .delete(likes)
          .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'dislike')));
        
        await db
          .update(posts)
          .set({ dislikesCount: sql`${posts.dislikesCount} - 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        return { disliked: false, dislikesCount: post?.dislikesCount || 0 };
      } else {
        // Remove like if exists (mutual exclusivity)
        if (existingLike) {
          await db
            .delete(likes)
            .where(and(eq(likes.postId, postId), eq(likes.userId, userId), eq(likes.type, 'like')));
          
          await db
            .update(posts)
            .set({ likesCount: sql`${posts.likesCount} - 1` })
            .where(eq(posts.id, postId));
        }

        // Add dislike
        await db
          .insert(likes)
          .values({ postId, userId, type: 'dislike', createdAt: new Date() });
        
        await db
          .update(posts)
          .set({ dislikesCount: sql`${posts.dislikesCount} + 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        return { disliked: true, dislikesCount: post?.dislikesCount || 1 };
      }
    } catch (error) {
      console.error('Error toggling dislike:', error);
      return { disliked: false, dislikesCount: 0 };
    }
  }

  async toggleVote(postId: number, userId: number): Promise<{ voted: boolean; votesCount: number }> {
    try {
      const [existingVote] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.postId, postId), eq(votes.userId, userId)));

      if (existingVote) {
        await db
          .delete(votes)
          .where(and(eq(votes.postId, postId), eq(votes.userId, userId)));
        
        await db
          .update(posts)
          .set({ votesCount: sql`${posts.votesCount} - 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        return { voted: false, votesCount: post?.votesCount || 0 };
      } else {
        await db
          .insert(votes)
          .values({ postId, userId });
        
        await db
          .update(posts)
          .set({ votesCount: sql`${posts.votesCount} + 1` })
          .where(eq(posts.id, postId));
          
        const [post] = await db.select().from(posts).where(eq(posts.id, postId));
        return { voted: true, votesCount: post?.votesCount || 1 };
      }
    } catch (error) {
      console.error('Error toggling vote:', error);
      return { voted: false, votesCount: 0 };
    }
  }

  async getUserLikes(userId: number): Promise<number[]> {
    try {
      const userLikes = await db
        .select({ postId: likes.postId })
        .from(likes)
        .where(eq(likes.userId, userId));
      return userLikes.map(like => like.postId);
    } catch (error) {
      console.error('Error getting user likes:', error);
      return [];
    }
  }

  async createComment(comment: InsertComment & { userId: number }): Promise<Comment> {
    try {
      const [newComment] = await db
        .insert(comments)
        .values(comment)
        .returning();
      
      await db
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, comment.postId));
        
      return newComment;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  async getPostComments(postId: number): Promise<(Comment & { user: Pick<User, 'username' | 'avatar'> })[]> {
    try {
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
    } catch (error) {
      console.error('Error getting post comments:', error);
      return [];
    }
  }

  async createStory(story: InsertStory & { userId: number; expiresAt?: Date }): Promise<Story> {
    try {
      // Clean up existing stories for this user if they're posting within 24 hours
      const existingStories = await db
        .select()
        .from(stories)
        .where(eq(stories.userId, story.userId))
        .orderBy(desc(stories.createdAt));
      
      // Delete old stories from the same user (keep only the latest one per 24 hours)
      for (const existingStory of existingStories) {
        const storyAge = Date.now() - new Date(existingStory.createdAt).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        if (storyAge < twentyFourHours) {
          // Delete the old story if posting within 24 hours
          await db
            .delete(stories)
            .where(eq(stories.id, existingStory.id));
        }
      }
      
      const expiresAt = story.expiresAt || new Date();
      if (!story.expiresAt) {
        expiresAt.setHours(expiresAt.getHours() + 24);
      }
      
      const [newStory] = await db
        .insert(stories)
        .values({
          ...story,
          expiresAt,
        })
        .returning();
      return newStory;
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  async getActiveStories(): Promise<StoryWithUser[]> {
    try {
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
    } catch (error) {
      console.error('Error getting active stories:', error);
      return [];
    }
  }

  async getUserStories(userId: number): Promise<Story[]> {
    try {
      const result = await db
        .select()
        .from(stories)
        .where(eq(stories.userId, userId))
        .orderBy(desc(stories.createdAt));
      return result;
    } catch (error) {
      console.error('Error getting user stories:', error);
      return [];
    }
  }

  async followUser(followerId: number, followingId: number): Promise<boolean> {
    try {
      await db
        .insert(follows)
        .values({ followerId, followingId });
      
      // Update follower counts
      await db
        .update(users)
        .set({ followersCount: sql`${users.followersCount} + 1` })
        .where(eq(users.id, followingId));
        
      await db
        .update(users)
        .set({ followingCount: sql`${users.followingCount} + 1` })
        .where(eq(users.id, followerId));
      
      // Create notification for followed user
      const [follower] = await db
        .select()
        .from(users)
        .where(eq(users.id, followerId));
      
      if (follower) {
        await this.createNotification(
          followingId,
          'follow',
          `${follower.username} started following you`,
          followerId
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
        .returning();
      
      if (result.length > 0) {
        // Update follower counts
        await db
          .update(users)
          .set({ followersCount: sql`${users.followersCount} - 1` })
          .where(eq(users.id, followingId));
          
        await db
          .update(users)
          .set({ followingCount: sql`${users.followingCount} - 1` })
          .where(eq(users.id, followerId));
      }
      
      return result.length > 0;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      const [follow] = await db
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
      return !!follow;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    try {
      const result = await db
        .select({
          user: users,
        })
        .from(follows)
        .innerJoin(users, eq(follows.followerId, users.id))
        .where(eq(follows.followingId, userId));
      return result.map(row => row.user);
    } catch (error) {
      console.error('Error getting user followers:', error);
      return [];
    }
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    try {
      const result = await db
        .select({
          user: users,
        })
        .from(follows)
        .innerJoin(users, eq(follows.followingId, users.id))
        .where(eq(follows.followerId, userId));
      return result.map(row => row.user);
    } catch (error) {
      console.error('Error getting user following:', error);
      return [];
    }
  }

  async getSuggestedUsers(userId: number): Promise<User[]> {
    try {
      const following = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, userId));
      
      const followingIds = following.map(f => f.followingId);
      followingIds.push(userId);
      
      const result = await db
        .select()
        .from(users)
        .where(notInArray(users.id, followingIds))
        .limit(5);
        
      return result;
    } catch (error) {
      console.error('Error getting suggested users:', error);
      return [];
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      const searchResults = await db
        .select()
        .from(users)
        .where(ilike(users.username, `%${query}%`))
        .limit(10);
      
      return searchResults;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async sendFriendRequest(fromUserId: number, toUserId: number): Promise<boolean> {
    try {
      // Check if request already exists
      const existing = await db
        .select()
        .from(friendRequests)
        .where(and(
          eq(friendRequests.fromUserId, fromUserId),
          eq(friendRequests.toUserId, toUserId)
        ));
      
      if (existing.length > 0) {
        return false; // Request already exists
      }
      
      // Check if they're already friends
      const alreadyFriends = await db
        .select()
        .from(follows)
        .where(and(
          eq(follows.followerId, fromUserId),
          eq(follows.followingId, toUserId)
        ));
      
      if (alreadyFriends.length > 0) {
        return false; // Already friends
      }
      
      await db.insert(friendRequests).values({
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: new Date()
      });
      
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      return false;
    }
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    try {
      const requests = await db
        .select({
          id: friendRequests.id,
          fromUserId: friendRequests.fromUserId,
          status: friendRequests.status,
          createdAt: friendRequests.createdAt,
          user: {
            id: users.id,
            username: users.username,
            avatar: users.avatar
          }
        })
        .from(friendRequests)
        .leftJoin(users, eq(friendRequests.fromUserId, users.id))
        .where(and(
          eq(friendRequests.toUserId, userId),
          eq(friendRequests.status, 'pending')
        ));
      
      return requests;
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return [];
    }
  }

  async acceptFriendRequest(requestId: number, userId: number): Promise<boolean> {
    try {
      // Get the friend request
      const [request] = await db
        .select()
        .from(friendRequests)
        .where(and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId)
        ));
      
      if (!request) {
        return false;
      }
      
      // Create mutual follow relationship
      await db.insert(follows).values([
        {
          followerId: request.fromUserId,
          followingId: request.toUserId,
          createdAt: new Date()
        },
        {
          followerId: request.toUserId,
          followingId: request.fromUserId,
          createdAt: new Date()
        }
      ]);
      
      // Create chat for the two users
      await db.insert(chats).values({
        user1Id: Math.min(request.fromUserId, request.toUserId),
        user2Id: Math.max(request.fromUserId, request.toUserId),
        createdAt: new Date()
      });
      
      // Update request status
      await db
        .update(friendRequests)
        .set({ status: 'accepted' })
        .where(eq(friendRequests.id, requestId));
      
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  }

  async rejectFriendRequest(requestId: number, userId: number): Promise<boolean> {
    try {
      await db
        .update(friendRequests)
        .set({ status: 'rejected' })
        .where(and(
          eq(friendRequests.id, requestId),
          eq(friendRequests.toUserId, userId)
        ));
      
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return false;
    }
  }

  async getUserChats(userId: number): Promise<any[]> {
    try {
      const userChats = await db
        .select({
          id: chats.id,
          createdAt: chats.createdAt,
          user1Id: chats.user1Id,
          user2Id: chats.user2Id
        })
        .from(chats)
        .where(or(
          eq(chats.user1Id, userId),
          eq(chats.user2Id, userId)
        ));
      
      // Get the other user details and messages for each chat
      const formattedChats = [];
      for (const chat of userChats) {
        const otherUserId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
        const [otherUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, otherUserId));
        
        // Get chat messages
        const chatMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.chatId, chat.id))
          .orderBy(messages.createdAt);
        
        if (otherUser) {
          formattedChats.push({
            id: chat.id,
            user: {
              id: otherUser.id,
              username: otherUser.username,
              avatar: otherUser.avatar
            },
            messages: chatMessages,
            lastMessage: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].content : null,
            lastMessageTime: chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].createdAt : chat.createdAt
          });
        }
      }
      
      return formattedChats;
    } catch (error) {
      console.error('Error getting user chats:', error);
      return [];
    }
  }

  async sendMessage(chatId: number, senderId: number, message: string): Promise<any> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values({
          chatId,
          senderId,
          content: message,
          createdAt: new Date()
        })
        .returning();
      
      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async searchPosts(query: string): Promise<PostWithUser[]> {
    try {
      const searchResults = await db
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
        .where(ilike(posts.caption, `%${query}%`))
        .orderBy(desc(posts.createdAt))
        .limit(20);

      return searchResults.map(row => ({
        ...row.post,
        user: row.user,
      }));
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  }

  async createNotification(userId: number, type: string, message: string, fromUserId?: number, postId?: number): Promise<void> {
    try {
      await db.insert(notifications).values({
        userId: userId,
        type: type,
        message: message,
        fromUserId: fromUserId || null,
        postId: postId || null,
        isRead: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  async getUserNotifications(userId: number): Promise<any[]> {
    try {
      const result = await db.execute(`
        SELECT n.*, u.username as from_username, u.avatar as from_avatar
        FROM notifications n
        LEFT JOIN users u ON n.from_user_id = u.id
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 20
      `, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      await db.execute(`
        UPDATE notifications SET is_read = true WHERE id = $1
      `, [notificationId]);
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Admin methods implementation
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async getAllPosts(): Promise<Post[]> {
    const allPosts = await db.select().from(posts);
    return allPosts;
  }

  async getAllPostsForAdmin(): Promise<PostWithUser[]> {
    const postsWithUsers = await db
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
      .orderBy(desc(posts.createdAt));

    return postsWithUsers.map(row => ({
      ...row.post,
      content: row.post.caption || row.post.title || '',
      user: row.user,
    }));
  }

  async banUser(userId: number, reason: string): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ isBanned: true, banReason: reason })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error banning user:', error);
      return false;
    }
  }

  async unbanUser(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ isBanned: false, banReason: null })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error unbanning user:', error);
      return false;
    }
  }

  async verifyUser(userId: number): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ isVerified: true })
        .where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error verifying user:', error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await db.delete(posts).where(eq(posts.userId, userId));
      await db.delete(comments).where(eq(comments.userId, userId));
      await db.delete(likes).where(eq(likes.userId, userId));
      await db.delete(follows).where(
        or(eq(follows.followerId, userId), eq(follows.followingId, userId))
      );
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async adminDeletePost(postId: number): Promise<boolean> {
    try {
      await db.delete(comments).where(eq(comments.postId, postId));
      await db.delete(likes).where(eq(likes.postId, postId));
      await db.delete(posts).where(eq(posts.id, postId));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  }

  async sendAdminMessage(userId: number, message: string, fromAdminId: number): Promise<boolean> {
    try {
      await this.createNotification(userId, 'admin_message', message, fromAdminId);
      return true;
    } catch (error) {
      console.error('Error sending admin message:', error);
      return false;
    }
  }

  async sendBroadcastNotification(message: string, userIds?: number[]): Promise<boolean> {
    try {
      if (userIds && userIds.length > 0) {
        for (const userId of userIds) {
          await this.createNotification(userId, 'admin_broadcast', message);
        }
      } else {
        const allUsers = await this.getAllUsers();
        for (const user of allUsers) {
          await this.createNotification(user.id, 'admin_broadcast', message);
        }
      }
      return true;
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      return false;
    }
  }

  async getUserActivityLogs(userId: number): Promise<any[]> {
    try {
      const userPosts = await this.getUserPosts(userId);
      const userComments = await db
        .select()
        .from(comments)
        .where(eq(comments.userId, userId))
        .orderBy(desc(comments.createdAt));
      
      const activities = [
        ...userPosts.map(post => ({
          type: 'post',
          action: 'created post',
          details: post.title || post.caption,
          timestamp: post.createdAt
        })),
        ...userComments.map(comment => ({
          type: 'comment',
          action: 'posted comment',
          details: comment.content,
          timestamp: comment.createdAt
        }))
      ];
      
      return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error getting user activity logs:', error);
      return [];
    }
  }

  async updateAppSettings(settings: any): Promise<boolean> {
    try {
      console.log('App settings updated:', settings);
      return true;
    } catch (error) {
      console.error('Error updating app settings:', error);
      return false;
    }
  }

  async getReportedContent(): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      console.error('Error getting reported content:', error);
      return [];
    }
  }

  async updatePost(id: number, userId: number, updates: Partial<Post>): Promise<Post | undefined> {
    try {
      const [updatedPost] = await db
        .update(posts)
        .set(updates)
        .where(and(eq(posts.id, id), eq(posts.userId, userId)))
        .returning();
      
      return updatedPost;
    } catch (error) {
      console.error('Error updating post:', error);
      return undefined;
    }
  }

  private async seedData() {
    try {
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

export const storage = new MemStorage();
export const videoCleanup = new VideoCleanupService();

// Schedule cleanup to run every 24 hours
setInterval(async () => {
  try {
    await videoCleanup.cleanupExpiredVideos();
    console.log('Video cleanup completed');
  } catch (error) {
    console.error('Video cleanup failed:', error);
  }
}, 24 * 60 * 60 * 1000); // 24 hours
