import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  avatar: text("avatar"),
  bio: text("bio"),
  website: text("website"),
  links: text("links"), // JSON string of [{name: "YouTube", url: "https://..."}]
  followersCount: integer("followers_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  totalPostsCreated: integer("total_posts_created").notNull().default(0),
  // Account status and verification
  accountStatus: text("account_status").notNull().default("live"), // live, banned, suspended
  accountStatusReason: text("account_status_reason"),
  accountStatusExpires: timestamp("account_status_expires"),
  mobile: text("mobile"),
  email: text("email"),
  mobileVerified: boolean("mobile_verified").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // Admin post fields
  title: text("title"),
  video1Url: text("video1_url"),
  video2Url: text("video2_url"),
  video3Url: text("video3_url"),
  rank: integer("rank"),
  otherRank: text("other_rank"), // e.g., "on yt:#2", "on memes:#4"
  category: text("category"), // memes, reels, model, news, dialogue, etc.
  type: text("type"), // admin specified type of trend
  detailsLink: text("details_link"),
  // Regular user post fields
  caption: text("caption"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  link: text("link"),
  // Interaction counts
  likesCount: integer("likes_count").notNull().default(0),
  dislikesCount: integer("dislikes_count").notNull().default(0),
  votesCount: integer("votes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  isAdminPost: boolean("is_admin_post").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull().default("like"), // 'like', 'dislike', 'vote'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const dislikes = pgTable("dislikes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const vibes = pgTable("vibes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  title: text("title"),
  content: text("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followingId: integer("following_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messageRequests = pgTable("message_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'like', 'follow', 'comment'
  message: text("message").notNull(),
  fromUserId: integer("from_user_id").references(() => users.id),
  postId: integer("post_id").references(() => posts.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cvs = pgTable("cvs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  data: text("data").notNull(), // JSON string of CV data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: integer("reported_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedUsername: text("reported_username").notNull(),
  reason: text("reason").notNull(),
  message: text("message"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Circle timeline messages (completely separate from DM system)
export const circleMessages = pgTable("circle_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Comments on Circle messages
export const circleMessageComments = pgTable("circle_message_comments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => circleMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Likes on Circle messages
export const circleMessageLikes = pgTable("circle_message_likes", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => circleMessages.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// DM (Direct Message) System - Completely separate from Circle messaging
export const dmChats = pgTable("dm_chats", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  user2Id: integer("user2_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const dmMessages = pgTable("dm_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => dmChats.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"), // text, image, video, file
  fileUrl: text("file_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// DM Request System
export const dmRequests = pgTable("dm_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstMessage: text("first_message").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, dismissed, blocked
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// DM Blocks (permanent and temporary)
export const dmBlocks = pgTable("dm_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedId: integer("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockType: text("block_type").notNull().default("permanent"), // permanent, temporary
  expiresAt: timestamp("expires_at"), // null for permanent blocks
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  followersCount: true,
  followingCount: true,
}).extend({
  username: z.string().regex(/^tp-[a-zA-Z0-9_]+$/, "Username must start with 'tp-' followed by alphanumeric characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  likesCount: true,
  commentsCount: true,
  userId: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
  expiresAt: true,
  userId: true,
});

export const insertVibeSchema = createInsertSchema(vibes).omit({
  id: true,
  createdAt: true,
  expiresAt: true,
  userId: true,
});

export const insertDMChatSchema = createInsertSchema(dmChats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDMMessageSchema = createInsertSchema(dmMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCVSchema = createInsertSchema(cvs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  reporterId: true,
});

export const insertMessageRequestSchema = createInsertSchema(messageRequests).omit({
  id: true,
  createdAt: true,
  fromUserId: true,
});

export const insertCircleMessageSchema = createInsertSchema(circleMessages).omit({
  id: true,
  createdAt: true,
  userId: true,
  likesCount: true,
  commentsCount: true,
});

export const insertCircleMessageCommentSchema = createInsertSchema(circleMessageComments).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Like = typeof likes.$inferSelect;
export type Dislike = typeof dislikes.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Vibe = typeof vibes.$inferSelect;
export type InsertVibe = z.infer<typeof insertVibeSchema>;
export type CV = typeof cvs.$inferSelect;
export type InsertCV = z.infer<typeof insertCVSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type MessageRequest = typeof messageRequests.$inferSelect;
export type InsertMessageRequest = z.infer<typeof insertMessageRequestSchema>;
export type CircleMessage = typeof circleMessages.$inferSelect;
export type InsertCircleMessage = z.infer<typeof insertCircleMessageSchema>;
export type CircleMessageComment = typeof circleMessageComments.$inferSelect;
export type InsertCircleMessageComment = z.infer<typeof insertCircleMessageCommentSchema>;
export type Follow = typeof follows.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;

// Extended types for API responses
export type PostWithUser = Post & {
  user: Pick<User, 'id' | 'username' | 'avatar' | 'isAdmin'>;
  isLiked?: boolean;
  comments?: (Comment & { user: Pick<User, 'username' | 'avatar'> })[];
};

export type StoryWithUser = Story & {
  user: Pick<User, 'username' | 'avatar'>;
};

export type VibeWithUser = Vibe & {
  user: Pick<User, 'id' | 'username' | 'avatar'>;
};

export type UserProfile = User & {
  isFollowing?: boolean;
  posts?: Post[];
};
