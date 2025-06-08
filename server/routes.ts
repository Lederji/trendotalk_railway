import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { users, reports, messageRequests, chats, messages, circleMessages, circleMessageComments, circleMessageLikes, dmChats, dmMessages } from "@shared/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { insertUserSchema, loginSchema, insertPostSchema, insertCommentSchema, insertStorySchema, insertVibeSchema, insertMessageRequestSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "./cloudinary";
import sgMail from "@sendgrid/mail";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage for Cloudinary
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Session middleware (simplified for in-memory storage)
const sessions = new Map<string, { userId: number; username: string }>();

// Make sessions globally available for admin routes
(global as any).sessions = sessions;

function generateSessionId(userId: number): string {
  return `${userId}_${Math.random().toString(36).substring(2)}_${Date.now().toString(36)}`;
}

async function authenticateUser(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if session exists in memory
  if (sessions.has(sessionId)) {
    const sessionData = sessions.get(sessionId);
    
    if (sessionData) {
      // Check if user is banned
      const user = await storage.getUser(sessionData.userId);
      if (user && user.accountStatus === 'banned') {
        return res.status(403).json({ 
          message: 'Account suspended',
          reason: user.accountStatusReason || 'Policy violation'
        });
      }
      
      req.user = sessionData;
      return next();
    }
  }
  
  // If session not found, try to recreate from sessionId format
  // SessionId format: userId_randomString_timestamp
  try {
    const parts = sessionId.split('_');
    
    if (parts.length >= 3) {
      const userId = parseInt(parts[0]);
      
      if (!isNaN(userId)) {
        const user = await storage.getUser(userId);
        
        if (user) {
          // Check if user is banned
          if (user.accountStatus === 'banned') {
            return res.status(403).json({ 
              message: 'Account suspended',
              reason: user.accountStatusReason || 'Policy violation'
            });
          }
          
          // Recreate session
          const sessionData = { userId: user.id, username: user.username };
          sessions.set(sessionId, sessionData);
          req.user = sessionData;
          return next();
        }
      }
    }
  } catch (error) {
    console.error('Session recreation error:', error);
  }
  
  return res.status(401).json({ message: 'Unauthorized' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Make storage globally accessible for session validation
  (global as any).storage = storage;
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  
  // Auth routes
  app.post('/api/signup', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Convert username to lowercase for consistency
      userData.username = userData.username.toLowerCase();
      
      // Check username availability
      const isAvailable = await storage.checkUsernameAvailability(userData.username);
      if (!isAvailable) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      const user = await storage.createUser(userData);
      const sessionId = generateSessionId(user.id);
      sessions.set(sessionId, { userId: user.id, username: user.username });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          isAdmin: user.isAdmin,
          avatar: user.avatar,
          bio: user.bio
        }, 
        sessionId 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      // Convert username to lowercase for case-insensitive login
      const user = await storage.getUserByUsername(username.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Use bcrypt to compare password with hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const sessionId = generateSessionId(user.id);
      sessions.set(sessionId, { userId: user.id, username: user.username });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          isAdmin: user.isAdmin,
          avatar: user.avatar,
          bio: user.bio
        }, 
        sessionId 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.post('/api/logout', authenticateUser, (req: any, res: any) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: 'Logged out successfully' });
  });

  app.get('/api/me', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Calculate follower counts excluding admin users
      const followers = await storage.getUserFollowers(user.id);
      const following = await storage.getUserFollowing(user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: followers.length,
        followingCount: following.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Username availability check - automatically add tp- prefix
  app.get('/api/check/:username', async (req, res) => {
    try {
      let { username } = req.params;
      
      // Always add tp- prefix if not present
      if (!username.startsWith('tp-')) {
        username = 'tp-' + username;
      }
      
      const isAvailable = await storage.checkUsernameAvailability(username);
      res.json({ available: isAvailable, username });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin Video Post routes
  app.post('/api/admin/posts', authenticateUser, upload.fields([
    { name: 'video1', maxCount: 1 },
    { name: 'video2', maxCount: 1 },
    { name: 'video3', maxCount: 1 }
  ]), async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required to create video posts' });
      }

      const { title, rank, otherRank, category, type, detailsLink } = req.body;

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let video1Url: string | undefined;
      let video2Url: string | undefined;
      let video3Url: string | undefined;

      try {
        if (files.video1 && files.video1[0]) {
          video1Url = await uploadToCloudinary(files.video1[0]);
        }
        if (files.video2 && files.video2[0]) {
          video2Url = await uploadToCloudinary(files.video2[0]);
        }
        if (files.video3 && files.video3[0]) {
          video3Url = await uploadToCloudinary(files.video3[0]);
        }
      } catch (uploadError) {
        console.error('Video upload error:', uploadError);
        return res.status(500).json({ message: 'Video upload failed' });
      }

      if (!video1Url && !video2Url && !video3Url) {
        return res.status(400).json({ message: 'At least one video is required' });
      }

      const post = await storage.createPost({
        title,
        rank: rank ? Number(rank) : undefined,
        otherRank: otherRank || undefined,
        category,
        type: type || undefined,
        detailsLink: detailsLink || undefined,
        video1Url,
        video2Url,
        video3Url,
        userId: user.id,
        isAdminPost: true,
      });
      
      const postWithUser = await storage.getPostById(post.id);
      res.json(postWithUser);
    } catch (error) {
      console.error('Video post creation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Regular User Post routes
  app.post('/api/posts', authenticateUser, upload.single('media'), async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { caption, link } = req.body;

      if (!caption?.trim()) {
        return res.status(400).json({ message: 'Caption is required' });
      }

      let mediaUrl: string | undefined;

      if (req.file) {
        try {
          mediaUrl = await uploadToCloudinary(req.file);
        } catch (uploadError) {
          console.error('Media upload error:', uploadError);
          return res.status(500).json({ message: 'Media upload failed' });
        }
      }

      const post = await storage.createPost({
        caption,
        imageUrl: req.file && req.file.mimetype.startsWith('image/') ? mediaUrl : undefined,
        videoUrl: req.file && req.file.mimetype.startsWith('video/') ? mediaUrl : undefined,
        link: link || undefined,
        userId: user.id,
        isAdminPost: false,
      });
      
      const postWithUser = await storage.getPostById(post.id);
      res.json(postWithUser);
    } catch (error) {
      console.error('Post creation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get posts from followed users
  app.get('/api/posts/following', authenticateUser, async (req: any, res: any) => {
    try {
      const followingUsers = await storage.getUserFollowing(req.user.userId);
      const followingIds = followingUsers.map(user => user.id);
      
      if (followingIds.length === 0) {
        return res.json([]);
      }
      
      const posts = await storage.getPostsFromUsers(followingIds);
      
      // Check if posts are liked by current user
      const userLikes = await storage.getUserLikes(req.user.userId);
      const postsWithLikes = posts.map(post => ({
        ...post,
        isLiked: userLikes.includes(post.id)
      }));
      
      res.json(postsWithLikes);
    } catch (error) {
      console.error('Error getting following posts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts', async (req, res) => {
    try {
      const { category, adminOnly, userId } = req.query;
      
      if (userId) {
        const posts = await storage.getUserPosts(Number(userId));
        
        // Check if posts are liked by current user (if authenticated)
        if (req.headers.authorization) {
          const sessionId = req.headers.authorization.replace('Bearer ', '');
          const session = sessions.get(sessionId);
          if (session) {
            const userLikes = await storage.getUserLikes(session.userId);
            const postsWithLikes = posts.map(post => ({
              ...post,
              isLiked: userLikes.includes(post.id)
            }));
            return res.json(postsWithLikes);
          }
        }
        
        return res.json(posts);
      }
      
      const posts = await storage.getPosts(
        adminOnly === 'true' ? true : adminOnly === 'false' ? false : undefined
      );
      
      // Check if posts are liked by current user (if authenticated)
      if (req.headers.authorization) {
        const sessionId = req.headers.authorization.replace('Bearer ', '');
        const session = sessions.get(sessionId);
        if (session) {
          const userLikes = await storage.getUserLikes(session.userId);
          const postsWithLikes = posts.map(post => ({
            ...post,
            isLiked: userLikes.includes(post.id)
          }));
          return res.json(postsWithLikes);
        }
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await storage.getPostById(Number(req.params.id));
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Check if post is liked by current user (if authenticated)
      if (req.headers.authorization) {
        const sessionId = req.headers.authorization.replace('Bearer ', '');
        const session = sessions.get(sessionId);
        if (session) {
          const userLikes = await storage.getUserLikes(session.userId);
          post.isLiked = userLikes.includes(post.id);
        }
      }
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/posts/:id', authenticateUser, async (req: any, res: any) => {
    try {
      const success = await storage.deletePost(Number(req.params.id), req.user.userId);
      if (!success) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/posts/:id', authenticateUser, async (req: any, res: any) => {
    try {
      const { title, rank, otherRank, category, type, detailsLink } = req.body;
      
      const updatedPost = await storage.updatePost(Number(req.params.id), req.user.userId, {
        title: title || null,
        rank: rank ? Number(rank) : null,
        otherRank: otherRank || null,
        category: category || null,
        type: type || null,
        detailsLink: detailsLink || null,
      });
      
      if (!updatedPost) {
        return res.status(404).json({ message: 'Post not found or unauthorized' });
      }
      
      const postWithUser = await storage.getPostById(updatedPost.id);
      res.json(postWithUser);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Like routes
  app.post('/api/posts/:id/like', authenticateUser, async (req: any, res: any) => {
    try {
      const result = await storage.toggleLike(Number(req.params.id), req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/dislike', authenticateUser, async (req: any, res: any) => {
    try {
      const result = await storage.toggleDislike(Number(req.params.id), req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/posts/:id/vote', authenticateUser, async (req: any, res: any) => {
    try {
      const result = await storage.toggleVote(Number(req.params.id), req.user.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Comment routes
  app.post('/api/posts/:id/comments', authenticateUser, async (req: any, res: any) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        postId: Number(req.params.id)
      });
      
      const comment = await storage.createComment({
        ...commentData,
        userId: req.user.userId
      });
      
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const comments = await storage.getPostComments(Number(req.params.id));
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Story routes
  app.post('/api/stories', authenticateUser, upload.single('media'), async (req: any, res: any) => {
    try {
      const storyData = insertStorySchema.parse(req.body);
      
      let imageUrl = null;
      let videoUrl = null;
      
      if (req.file) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(req.file);
          if (req.file.mimetype.startsWith('image')) {
            imageUrl = cloudinaryUrl;
          } else if (req.file.mimetype.startsWith('video')) {
            videoUrl = cloudinaryUrl;
          }
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({ message: 'File upload failed' });
        }
      }
      
      // Set 24-hour expiry for vibes
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const story = await storage.createStory({
        ...storyData,
        userId: req.user.userId,
        imageUrl,
        videoUrl,
        expiresAt,
      });
      
      res.json(story);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error('Story creation error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/stories', async (req, res) => {
    try {
      const stories = await storage.getActiveStories();
      res.json(stories);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Vibe routes
  app.post('/api/vibes', authenticateUser, upload.single('file'), async (req: any, res: any) => {
    try {
      const { title, content } = req.body;
      
      if (!title?.trim()) {
        return res.status(400).json({ message: 'Title is required' });
      }
      
      let imageUrl = null;
      let videoUrl = null;
      
      if (req.file) {
        try {
          const cloudinaryUrl = await uploadToCloudinary(req.file);
          if (req.file.mimetype.startsWith('image')) {
            imageUrl = cloudinaryUrl;
          } else if (req.file.mimetype.startsWith('video')) {
            videoUrl = cloudinaryUrl;
          }
        } catch (uploadError) {
          console.error('Vibe media upload error:', uploadError);
          return res.status(500).json({ message: 'Media upload failed' });
        }
      }
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now
      
      const vibe = await storage.createVibe({
        title: title.trim(),
        content: content?.trim() || null,
        imageUrl,
        videoUrl,
        userId: req.user.userId,
        expiresAt
      });
      
      res.json(vibe);
    } catch (error) {
      console.error('Vibe creation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/vibes', authenticateUser, async (req: any, res: any) => {
    try {
      const vibes = await storage.getActiveVibes();
      res.json(vibes);
    } catch (error) {
      console.error('Error getting vibes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Get vibes for a specific user
  app.get('/api/vibes/user/:userId', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const userVibes = await storage.getUserVibes(userId);
      res.json(userVibes);
    } catch (error) {
      console.error('Error getting user vibes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's own vibes
  app.get('/api/stories/user', authenticateUser, async (req: any, res: any) => {
    try {
      const userVibes = await storage.getUserStories(req.user.userId);
      // Filter out expired vibes (older than 24 hours)
      const activeVibes = userVibes.filter(vibe => {
        const now = new Date();
        const vibeTime = new Date(vibe.createdAt);
        const hoursDiff = (now.getTime() - vibeTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff < 24;
      });
      res.json(activeVibes);
    } catch (error) {
      console.error('Error getting user vibes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get Circle friends' vibes (only friends who have active vibes)
  app.get('/api/stories/circle', authenticateUser, async (req: any, res: any) => {
    try {
      const friends = await storage.getUserFollowing(req.user.userId);
      const friendsWithVibes = [];
      
      for (const friend of friends) {
        const friendVibes = await storage.getUserStories(friend.id);
        // Filter out expired vibes (older than 24 hours)
        const activeVibes = friendVibes.filter(vibe => {
          const now = new Date();
          const vibeTime = new Date(vibe.createdAt);
          const hoursDiff = (now.getTime() - vibeTime.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 24;
        });
        
        if (activeVibes.length > 0) {
          friendsWithVibes.push({
            ...friend,
            vibes: activeVibes
          });
        }
      }
      
      res.json(friendsWithVibes);
    } catch (error) {
      console.error('Error getting circle vibes:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User search endpoint - MUST be before /api/users/:username
  app.get('/api/users/search', authenticateUser, async (req: any, res: any) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }
      
      const users = await storage.searchUsers(query.trim());
      res.json(users);
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Search posts and hashtags endpoint for home page
  app.get('/api/search', authenticateUser, async (req: any, res: any) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 1) {
        return res.json({ users: [], posts: [] });
      }
      
      const users = await storage.searchUsers(query.trim());
      const posts = await storage.searchPosts(query.trim());
      
      res.json({ users, posts });
    } catch (error) {
      console.error('Error searching:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Profile update endpoint
  app.patch('/api/users/profile', authenticateUser, async (req: any, res: any) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser(req.user.userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload avatar
  app.post('/api/upload/avatar', authenticateUser, upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const cloudinaryUrl = await uploadToCloudinary(req.file);
      
      const updatedUser = await storage.updateUser(req.user.userId, {
        avatar: cloudinaryUrl,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ url: cloudinaryUrl });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ message: 'Avatar upload failed' });
    }
  });

  // User routes - specific routes MUST come before general patterns
  
  // Get user by username (for profile visits via username)
  app.get('/api/users/profile/:username', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let isFollowing = false;
      if (req.user.userId !== user.id) {
        isFollowing = await storage.isFollowing(req.user.userId, user.id);
      }
      
      const posts = await storage.getUserPosts(user.id);
      
      // Calculate follower counts excluding admin users
      const followers = await storage.getUserFollowers(user.id);
      const following = await storage.getUserFollowing(user.id);
      
      const { password, ...userProfile } = user;
      res.json({
        ...userProfile,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing,
        posts
      });
    } catch (error) {
      console.error('Error getting user by username:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/users/:id/follow', authenticateUser, async (req: any, res: any) => {
    try {
      const success = await storage.followUser(req.user.userId, Number(req.params.id));
      if (!success) {
        return res.status(400).json({ message: 'Cannot follow user' });
      }
      res.json({ message: 'User followed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/users/:id/follow', authenticateUser, async (req: any, res: any) => {
    try {
      const success = await storage.unfollowUser(req.user.userId, Number(req.params.id));
      if (!success) {
        return res.status(400).json({ message: 'Cannot unfollow user' });
      }
      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Follow back - specifically for notification interactions
  app.post('/api/users/:username/follow-back', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const success = await storage.followUser(req.user.userId, user.id);
      if (!success) {
        return res.status(400).json({ message: 'Cannot follow user' });
      }
      res.json({ message: 'Following back successfully' });
    } catch (error) {
      console.error('Error following back:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Friend request routes
  app.get('/api/friend-requests', authenticateUser, async (req: any, res: any) => {
    try {
      const requests = await storage.getFriendRequests(req.user.userId);
      res.json(requests);
    } catch (error) {
      console.error('Error getting friend requests:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/friend-requests/:userId', authenticateUser, async (req: any, res: any) => {
    try {
      const targetUserId = Number(req.params.userId);
      const success = await storage.sendFriendRequest(req.user.userId, targetUserId);
      
      if (success) {
        res.json({ message: 'Friend request sent', success: true });
      } else {
        res.status(400).json({ message: 'Failed to send request' });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/friend-requests/:requestId/accept', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      const success = await storage.acceptFriendRequest(requestId, req.user.userId);
      if (!success) {
        return res.status(400).json({ message: 'Cannot accept friend request' });
      }
      res.json({ message: 'Friend request accepted' });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/friend-requests/:requestId/reject', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      const success = await storage.rejectFriendRequest(requestId, req.user.userId);
      if (!success) {
        return res.status(400).json({ message: 'Cannot reject friend request' });
      }
      res.json({ message: 'Friend request rejected' });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Remove friend (kick out)
  app.post('/api/friends/remove', authenticateUser, async (req: any, res: any) => {
    try {
      const { friendId } = req.body;
      const success = await storage.removeFriend(req.user.userId, friendId);
      if (!success) {
        return res.status(400).json({ message: 'Cannot remove friend' });
      }
      res.json({ message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Error removing friend:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user profile by ID - MUST handle numeric IDs
  app.get('/api/users/:userId(\\d+)', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      console.log('✓ NUMERIC USER ID ROUTE called for userId:', userId, 'Session userId:', req.user.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const user = await storage.getUser(userId);
      console.log('✓ User found in NUMERIC route:', user ? 'Yes' : 'No', user?.username, 'Followers:', user?.followersCount, 'Following:', user?.followingCount);
      if (!user) {
        console.log('✓ User not found in NUMERIC route, returning 404');
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if current user is following this user
      let isFollowing = false;
      if (req.user.userId !== userId) {
        isFollowing = await storage.isFollowing(req.user.userId, userId);
      }
      
      // Get user's posts
      const posts = await storage.getUserPosts(userId);
      
      // Calculate follower counts excluding admin users
      const followers = await storage.getUserFollowers(userId);
      const following = await storage.getUserFollowing(userId);
      
      // Remove sensitive information and add computed fields
      const { password, ...userProfile } = user;
      res.json({
        ...userProfile,
        followersCount: followers.length,
        followingCount: following.length,
        isFollowing,
        posts
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user posts
  app.get('/api/users/:userId/posts', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const posts = await storage.getUserPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error('Error getting user posts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user followers list
  app.get('/api/users/:userId/followers', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const followers = await storage.getUserFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Error getting user followers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user following list
  app.get('/api/users/:userId/following-list', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const following = await storage.getUserFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Error getting user following:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Check if following user
  app.get('/api/users/:userId/following', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const isFollowing = await storage.isFollowing(req.user.userId, userId);
      res.json(isFollowing);
    } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get post detail
  app.get('/api/posts/:postId', authenticateUser, async (req: any, res: any) => {
    try {
      const postId = Number(req.params.postId);
      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Increment view count for videos
      if (post.video1Url || post.video2Url || post.video3Url || post.videoUrl) {
        await storage.incrementPostViews(postId);
        post.viewsCount = (post.viewsCount || 0) + 1;
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error getting post detail:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Report post
  app.post('/api/posts/:postId/report', authenticateUser, async (req: any, res: any) => {
    try {
      const postId = Number(req.params.postId);
      const { reason } = req.body;
      const reporterId = req.user.userId;
      
      // Check if post exists
      const post = await storage.getPostById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Create report record for admin panel
      const report = {
        id: Date.now(),
        postId,
        reporterId,
        reason: reason || 'Inappropriate content',
        status: 'pending',
        createdAt: new Date(),
        reporterUsername: req.user.username,
        postContent: post.caption || 'Media post',
        postAuthor: post.user?.username || 'Unknown'
      };
      
      // Store the report by creating notifications for admins
      try {
        // Get admin users directly from database using the existing createPostReport method implementation
        const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true));
        
        for (const admin of adminUsers) {
          await storage.createNotification(
            admin.id,
            'post_report',
            `New post report: ${report.reason}`,
            report.reporterId,
            report.postId
          );
        }
      } catch (notificationError) {
        console.error('Error creating admin notifications:', notificationError);
      }
      
      res.json({ message: 'Post reported successfully' });
    } catch (error) {
      console.error('Error reporting post:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Follow user
  app.post('/api/users/:userId/follow', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const success = await storage.followUser(req.user.userId, userId);
      if (!success) {
        return res.status(400).json({ message: 'Cannot follow user' });
      }
      res.json({ message: 'User followed successfully' });
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Unfollow user
  app.post('/api/users/:userId/unfollow', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const success = await storage.unfollowUser(req.user.userId, userId);
      if (!success) {
        return res.status(400).json({ message: 'Cannot unfollow user' });
      }
      res.json({ message: 'User unfollowed successfully' });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's followers list
  app.get('/api/users/:userId/followers', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const followers = await storage.getUserFollowers(userId);
      res.json(followers);
    } catch (error) {
      console.error('Error getting followers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user's following list
  app.get('/api/users/:userId/following-list', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const following = await storage.getUserFollowing(userId);
      res.json(following);
    } catch (error) {
      console.error('Error getting following list:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update user profile
  app.patch('/api/users/:userId', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      
      // Users can only update their own profile
      if (userId !== req.user.userId) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }
      
      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove sensitive information
      const { password, ...userProfile } = updatedUser;
      res.json(userProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Chat routes
  // Get friend chats only (excluding admin messages)
  app.get('/api/chats', authenticateUser, async (req: any, res: any) => {
    try {
      const currentUser = await storage.getUser(req.user.userId);
      const chats = await storage.getUserChats(req.user.userId);
      
      // Filter out admin chats - only show friend chats
      // If current user is not admin, hide all chats with admin users
      const friendChats = await Promise.all(chats.map(async (chat) => {
        const otherUser = await storage.getUser(chat.user.id);
        // Hide admin chats for non-admin users
        if (!currentUser?.isAdmin && otherUser?.isAdmin) {
          return null;
        }
        return chat;
      }));
      res.json(friendChats.filter(chat => chat !== null));
    } catch (error) {
      console.error('Error getting chats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get admin messages for Messages page (separate from friend chats)
  app.get('/api/admin-messages', authenticateUser, async (req: any, res: any) => {
    try {
      const allChats = await storage.getUserChats(req.user.userId);
      // Filter to only show admin chats
      const adminChats = await Promise.all(allChats.map(async (chat) => {
        const otherUser = await storage.getUser(chat.user.id);
        if (otherUser?.isAdmin) {
          return {
            id: chat.id,
            user: {
              id: otherUser.id,
              username: otherUser.username,
              displayName: "TrendoTalk Admin",
              avatar: otherUser.avatar
            },
            messages: chat.messages,
            lastMessage: chat.lastMessage,
            lastMessageTime: chat.lastMessageTime
          };
        }
        return null;
      }));
      res.json(adminChats.filter(chat => chat !== null));
    } catch (error) {
      console.error('Error getting admin messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/friends/status', authenticateUser, async (req: any, res: any) => {
    try {
      const friends = await storage.getUserFollowing(req.user.userId);
      res.json(friends);
    } catch (error) {
      console.error('Error getting friends status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send message request
  app.post('/api/message-requests', authenticateUser, async (req: any, res: any) => {
    try {
      const { toUserId, message } = req.body;
      const fromUserId = req.user.userId;

      if (!toUserId || !message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Recipient and message are required' });
      }

      if (fromUserId === toUserId) {
        return res.status(400).json({ message: 'Cannot send message to yourself' });
      }

      // Check if target user exists
      const targetUser = await storage.getUser(toUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if there's already a pending request
      const existingRequest = await db
        .select()
        .from(messageRequests)
        .where(
          and(
            eq(messageRequests.fromUserId, fromUserId),
            eq(messageRequests.toUserId, toUserId),
            eq(messageRequests.status, 'pending')
          )
        );

      if (existingRequest.length > 0) {
        return res.status(400).json({ message: 'Message request already sent' });
      }

      // Check if they already have an active chat
      const existingChat = await db
        .select()
        .from(chats)
        .where(
          or(
            and(eq(chats.user1Id, fromUserId), eq(chats.user2Id, toUserId)),
            and(eq(chats.user1Id, toUserId), eq(chats.user2Id, fromUserId))
          )
        );

      if (existingChat.length > 0) {
        return res.status(400).json({ message: 'Chat already exists' });
      }

      // Create message request
      const [newRequest] = await db
        .insert(messageRequests)
        .values({
          fromUserId,
          toUserId,
          message: message.trim(),
          status: 'pending'
        })
        .returning();

      res.json({ message: 'Message request sent successfully', request: newRequest });
    } catch (error) {
      console.error('Error sending message request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get incoming message requests
  app.get('/api/message-requests', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;

      const requests = await db
        .select({
          id: messageRequests.id,
          fromUserId: messageRequests.fromUserId,
          message: messageRequests.message,
          status: messageRequests.status,
          createdAt: messageRequests.createdAt,
          fromUser: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar
          }
        })
        .from(messageRequests)
        .leftJoin(users, eq(messageRequests.fromUserId, users.id))
        .where(
          and(
            eq(messageRequests.toUserId, userId),
            eq(messageRequests.status, 'pending')
          )
        )
        .orderBy(messageRequests.createdAt);

      res.json(requests);
    } catch (error) {
      console.error('Error getting message requests:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Accept or reject message request
  app.patch('/api/message-requests/:requestId', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      const { action } = req.body; // 'accept' or 'reject'
      const userId = req.user.userId;

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }

      // Get the request and verify ownership
      const [request] = await db
        .select()
        .from(messageRequests)
        .where(
          and(
            eq(messageRequests.id, requestId),
            eq(messageRequests.toUserId, userId),
            eq(messageRequests.status, 'pending')
          )
        );

      if (!request) {
        return res.status(404).json({ message: 'Message request not found' });
      }

      if (action === 'accept') {
        // Create a new chat between the two users
        const [newChat] = await db
          .insert(chats)
          .values({
            user1Id: Math.min(request.fromUserId, request.toUserId),
            user2Id: Math.max(request.fromUserId, request.toUserId)
          })
          .returning();

        // Send the initial message to the new chat
        await db
          .insert(messages)
          .values({
            chatId: newChat.id,
            senderId: request.fromUserId,
            content: request.message
          });

        // Update request status to accepted
        await db
          .update(messageRequests)
          .set({ status: 'accepted' })
          .where(eq(messageRequests.id, requestId));

        res.json({ message: 'Message request accepted', chatId: newChat.id });
      } else {
        // Update request status to rejected
        await db
          .update(messageRequests)
          .set({ status: 'rejected' })
          .where(eq(messageRequests.id, requestId));

        res.json({ message: 'Message request rejected' });
      }
    } catch (error) {
      console.error('Error handling message request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create or get existing DM chat (separate from Circle messaging)
  app.post('/api/dm/create', authenticateUser, async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      const targetUserId = Number(userId);
      
      if (!targetUserId || targetUserId === req.user.userId) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if DM chat already exists between these users
      const existingChatQuery = `
        SELECT id FROM dm_chats 
        WHERE (user1_id = $1 AND user2_id = $2)
           OR (user1_id = $2 AND user2_id = $1)
        LIMIT 1
      `;
      const existingChat = await db.execute(sql.raw(existingChatQuery, [req.user.userId, targetUserId]));
      
      if (existingChat.rowCount && existingChat.rowCount > 0) {
        return res.json({ chatId: (existingChat.rows[0] as any).id, exists: true });
      }
      
      // Create new DM chat
      const createChatQuery = `
        INSERT INTO dm_chats (user1_id, user2_id) 
        VALUES ($1, $2) 
        RETURNING id
      `;
      const newChatResult = await db.execute(sql.raw(createChatQuery, [req.user.userId, targetUserId]));
      
      const newChat = newChatResult.rows[0] as any;
      
      res.json({ chatId: newChat.id, exists: false });
    } catch (error) {
      console.error('Error creating DM chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get DM chat details
  app.get('/api/dm/:chatId', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      
      const chatResult = await db.execute(sql`
        SELECT dc.*, 
               u1.username as user1_username, u1.avatar as user1_avatar,
               u2.username as user2_username, u2.avatar as user2_avatar
        FROM dm_chats dc
        JOIN users u1 ON dc.user1_id = u1.id
        JOIN users u2 ON dc.user2_id = u2.id
        WHERE dc.id = ${chatId} 
        AND (dc.user1_id = ${req.user.userId} OR dc.user2_id = ${req.user.userId})
      `);
      
      if (chatResult.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      const chat = chatResult[0];
      const otherUser = chat.user1_id === req.user.userId ? 
        { id: chat.user2_id, username: chat.user2_username, avatar: chat.user2_avatar } :
        { id: chat.user1_id, username: chat.user1_username, avatar: chat.user1_avatar };
      
      res.json({
        id: chat.id,
        user: otherUser,
        createdAt: chat.created_at
      });
    } catch (error) {
      console.error('Error getting DM chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get DM messages
  app.get('/api/dm/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      
      // Verify user has access to this chat
      const chatResult = await db.execute(sql`
        SELECT * FROM dm_chats 
        WHERE id = ${chatId} 
        AND (user1_id = ${req.user.userId} OR user2_id = ${req.user.userId})
      `);
      
      if (chatResult.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      const messagesResult = await db.execute(sql`
        SELECT dm.*, 
               u.username, u.avatar, u.display_name
        FROM dm_messages dm
        JOIN users u ON dm.sender_id = u.id
        WHERE dm.chat_id = ${chatId}
        ORDER BY dm.created_at ASC
      `);
      
      res.json(messagesResult);
    } catch (error) {
      console.error('Error getting DM messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send DM message
  app.post('/api/dm/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      // Verify user has access to this chat
      const chatResult = await db.execute(sql`
        SELECT * FROM dm_chats 
        WHERE id = ${chatId} 
        AND (user1_id = ${req.user.userId} OR user2_id = ${req.user.userId})
      `);
      
      if (chatResult.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Insert message
      const messageResult = await db.execute(sql`
        INSERT INTO dm_messages (chat_id, sender_id, content) 
        VALUES (${chatId}, ${req.user.userId}, ${message.trim()}) 
        RETURNING *
      `);
      
      // Update chat timestamp
      await db.execute(sql`
        UPDATE dm_chats 
        SET updated_at = NOW() 
        WHERE id = ${chatId}
      `);
      
      const newMessage = messageResult[0];
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending DM message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create or get existing chat with a user (Instagram-style direct messaging)
  app.post('/api/chats/create', authenticateUser, async (req: any, res: any) => {
    try {
      const { userId } = req.body;
      const targetUserId = Number(userId);
      
      if (!targetUserId || targetUserId === req.user.userId) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if chat already exists between these users
      const existingChat = await db
        .select()
        .from(chats)
        .where(
          or(
            and(eq(chats.user1Id, req.user.userId), eq(chats.user2Id, targetUserId)),
            and(eq(chats.user1Id, targetUserId), eq(chats.user2Id, req.user.userId))
          )
        );
      
      if (existingChat.length > 0) {
        return res.json({ chatId: existingChat[0].id, exists: true });
      }
      
      // Create new chat directly (Instagram-style)
      const [newChat] = await db
        .insert(chats)
        .values({
          user1Id: req.user.userId,
          user2Id: targetUserId,
        })
        .returning();
      
      res.json({ chatId: newChat.id, exists: false });
    } catch (error) {
      console.error('Error creating chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/chats/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message cannot be empty' });
      }
      
      // Verify user has access to this chat
      const userChats = await storage.getUserChats(req.user.userId);
      const chat = userChats.find(c => c.id === chatId);
      
      if (!chat) {
        return res.status(403).json({ message: 'Access denied to this chat' });
      }
      
      // Get the current user and other user in the chat
      const currentUser = await storage.getUser(req.user.userId);
      const otherUser = await storage.getUser(chat.user.id);
      
      // Prevent non-admin users from messaging admin users
      if (!currentUser?.isAdmin && otherUser?.isAdmin) {
        return res.status(403).json({ message: 'You cannot send messages to admin users. Only admins can initiate conversations with users.' });
      }
      
      const newMessage = await storage.sendMessage(chatId, req.user.userId, message.trim());
      console.log('Message sent successfully:', newMessage);
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/users/suggested', authenticateUser, async (req: any, res: any) => {
    try {
      const suggested = await storage.getSuggestedUsers(req.user.userId);
      res.json(suggested.map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followersCount
      })));
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Search endpoint
  app.get("/api/search", authenticateUser, async (req: any, res: any) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        return res.json({ users: [], posts: [] });
      }

      const users = await storage.searchUsers(query);
      const posts = await storage.searchPosts(query);

      res.json({ users, posts });
    } catch (error) {
      console.error('Error searching:', error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications', authenticateUser, async (req: any, res: any) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/notifications/:id/read', authenticateUser, async (req: any, res: any) => {
    try {
      const notificationId = Number(req.params.id);
      const success = await storage.markNotificationAsRead(notificationId);
      
      if (success) {
        res.json({ message: 'Notification marked as read' });
      } else {
        res.status(404).json({ message: 'Notification not found' });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get individual chat details
  app.get('/api/chats/:chatId', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const currentUser = await storage.getUser(req.user.userId);
      const userChats = await storage.getUserChats(req.user.userId);
      
      const chat = userChats.find(c => c.id === chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Block non-admin users from accessing chats with admin users
      const otherUser = await storage.getUser(chat.user.id);
      if (!currentUser?.isAdmin && otherUser?.isAdmin) {
        return res.status(403).json({ message: 'Access denied to this chat' });
      }
      
      res.json(chat);
    } catch (error) {
      console.error('Error getting chat:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get chat messages
  app.get('/api/chats/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const currentUser = await storage.getUser(req.user.userId);
      const userChats = await storage.getUserChats(req.user.userId);
      
      const chat = userChats.find(c => c.id === chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Block non-admin users from accessing messages in chats with admin users
      const otherUser = await storage.getUser(chat.user.id);
      if (!currentUser?.isAdmin && otherUser?.isAdmin) {
        return res.status(403).json({ message: 'Access denied to this chat' });
      }
      
      res.json(chat.messages || []);
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send message
  app.post('/api/chats/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Message content is required' });
      }
      
      const newMessage = await storage.sendMessage(chatId, req.user.userId, message);
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload file to chat (images, videos, documents)
  app.post('/api/chats/:chatId/upload', authenticateUser, upload.single('file'), async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { message } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ message: 'File is required' });
      }
      
      // Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(req.file);
      
      // Determine file type and create appropriate message
      let messageContent = message || '';
      const fileType = req.file.mimetype;
      
      if (fileType.startsWith('image/')) {
        messageContent = `📷 ${messageContent || 'Shared a photo'}\n${cloudinaryUrl}`;
      } else if (fileType.startsWith('video/')) {
        messageContent = `🎥 ${messageContent || 'Shared a video'}\n${cloudinaryUrl}`;
      } else {
        messageContent = `📄 ${messageContent || 'Shared a document'}\n${cloudinaryUrl}`;
      }
      
      // Send file message
      const fileMessage = await storage.sendMessage(chatId, req.user.userId, messageContent);
      res.json(fileMessage);
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload voice message
  app.post('/api/chats/:chatId/voice', authenticateUser, upload.single('audio'), async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      
      if (!req.file) {
        return res.status(400).json({ message: 'Audio file is required' });
      }
      
      // Upload to Cloudinary
      const audioUrl = await uploadToCloudinary(req.file);
      
      // Send voice message
      const voiceMessage = await storage.sendMessage(chatId, req.user.userId, `🎵 Voice message\n${audioUrl}`);
      res.json(voiceMessage);
    } catch (error) {
      console.error('Error uploading voice message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Share location
  app.post('/api/chats/:chatId/location', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { latitude, longitude, address } = req.body;
      
      const locationMessage = `📍 ${address || 'Shared location'}\nLat: ${latitude}, Lng: ${longitude}`;
      const message = await storage.sendMessage(chatId, req.user.userId, locationMessage);
      res.json(message);
    } catch (error) {
      console.error('Error sharing location:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Share contact
  app.post('/api/chats/:chatId/contact', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { name, phone, email } = req.body;
      
      const contactMessage = `👤 Contact: ${name}\n📞 ${phone}\n📧 ${email || 'No email'}`;
      const message = await storage.sendMessage(chatId, req.user.userId, contactMessage);
      res.json(message);
    } catch (error) {
      console.error('Error sharing contact:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Account Center API endpoints
  
  // Get account status
  app.get('/api/account/status', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        status: user.accountStatus || 'live',
        reason: user.accountStatusReason,
        expiresAt: user.accountStatusExpires
      });
    } catch (error) {
      console.error('Error getting account status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get verification data
  app.get('/api/account/verification', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        mobile: user.mobile,
        email: user.email,
        mobileVerified: user.mobileVerified || false,
        emailVerified: user.emailVerified || false
      });
    } catch (error) {
      console.error('Error getting verification data:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send mobile OTP
  app.post('/api/account/send-mobile-otp', authenticateUser, async (req: any, res: any) => {
    try {
      const { mobile } = req.body;
      if (!mobile || !/^\+?[\d\s-()]+$/.test(mobile)) {
        return res.status(400).json({ message: 'Valid mobile number required' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in memory (in production, use Redis or database)
      const otpKey = `mobile_otp_${req.user.userId}`;
      (global as any)[otpKey] = { otp, mobile, expires: Date.now() + 5 * 60 * 1000 }; // 5 minutes
      
      // Update user's mobile number
      await storage.updateUser(req.user.userId, { mobile });
      
      console.log(`Mobile OTP for ${mobile}: ${otp}`); // In production, send via SMS service
      
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending mobile OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify mobile OTP
  app.post('/api/account/verify-mobile-otp', authenticateUser, async (req: any, res: any) => {
    try {
      const { mobile, otp } = req.body;
      if (!mobile || !otp) {
        return res.status(400).json({ message: 'Mobile number and OTP required' });
      }

      // Check stored OTP
      const otpKey = `mobile_otp_${req.user.userId}`;
      const storedData = (global as any)[otpKey];
      
      if (!storedData || storedData.expires < Date.now()) {
        return res.status(400).json({ message: 'OTP expired' });
      }
      
      if (storedData.otp !== otp || storedData.mobile !== mobile) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      // Mark mobile as verified
      await storage.updateUser(req.user.userId, { 
        mobile, 
        mobileVerified: true 
      });
      
      // Clear OTP
      delete (global as any)[otpKey];
      
      res.json({ message: 'Mobile verified successfully' });
    } catch (error) {
      console.error('Error verifying mobile OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Report user
  app.post('/api/users/:userId/report', authenticateUser, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { reason, message } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Reason is required' });
      }
      
      // Get reported user info
      const reportedUser = await storage.getUser(parseInt(userId));
      if (!reportedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create report
      const reportData = {
        reporterId: req.user.userId,
        reportedUserId: parseInt(userId),
        reportedUsername: reportedUser.username,
        reason,
        message: message || null,
        status: 'pending'
      };
      
      // Direct database insertion for reports
      await db.insert(reports).values(reportData);
      
      res.json({ message: 'Report submitted successfully' });
    } catch (error) {
      console.error('Error creating report:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Send email OTP
  app.post('/api/account/send-email-otp', authenticateUser, async (req: any, res: any) => {
    try {
      const { email } = req.body;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Valid email address required' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in memory (in production, use Redis or database)
      const otpKey = `email_otp_${req.user.userId}`;
      (global as any)[otpKey] = { otp, email, expires: Date.now() + 10 * 60 * 1000 }; // 10 minutes
      
      // Update user's email
      await storage.updateUser(req.user.userId, { email });
      
      // Send email with SendGrid
      if (process.env.SENDGRID_API_KEY) {
        try {
          sgMail.setApiKey(process.env.SENDGRID_API_KEY);
          
          const emailTemplate = `
<!DOCTYPE html>
<html>
<head><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
.container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
.header { background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; padding: 30px; text-align: center; }
.header h1 { margin: 0; font-size: 28px; font-weight: bold; }
.content { padding: 40px 30px; }
.otp-box { background: linear-gradient(135deg, #f3e8ff, #fce7f3); border: 2px solid #ec4899; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0; }
.otp-code { font-size: 36px; font-weight: bold; color: #7c3aed; letter-spacing: 8px; margin: 10px 0; font-family: 'Courier New', monospace; }
.footer { background-color: #f1f5f9; padding: 20px 30px; text-align: center; color: #64748b; font-size: 14px; }
.warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>🎭 TrendoTalk</h1>
    <p style="margin: 0; opacity: 0.9;">Email Verification Required</p>
  </div>
  <div class="content">
    <h2 style="color: #1e293b; margin-bottom: 20px;">Verify Your Email Address</h2>
    <p style="color: #475569; font-size: 16px;">Hello! You've requested to verify your email address <strong>${email}</strong> for your TrendoTalk account.</p>
    <div class="otp-box">
      <p style="margin: 0; color: #7c3aed; font-weight: bold;">Your Verification Code:</p>
      <div class="otp-code">${otp}</div>
      <p style="margin: 0; color: #64748b; font-size: 14px;">Valid for 10 minutes</p>
    </div>
    <p style="color: #475569;">Enter this code in the TrendoTalk app to complete your email verification.</p>
    <div class="warning">
      <strong>🔒 Security Notice:</strong> Never share this code with anyone. TrendoTalk will never ask for this code via phone, email, or social media.
    </div>
  </div>
  <div class="footer">
    <p>This email was sent from TrendoTalk's secure verification system.</p>
    <p>If you didn't request this verification, please ignore this email.</p>
    <p style="margin-top: 15px;"><strong>TrendoTalk</strong> - Connect, Share, Trend</p>
  </div>
</div>
</body>
</html>`;

          await sgMail.send({
            to: email,
            from: 'pakiilena@gmail.com', // Using your verified email address
            subject: 'TrendoTalk - Verify Your Email Address',
            html: emailTemplate,
            text: `TrendoTalk Email Verification\n\nYour verification code: ${otp}\n\nValid for 10 minutes.\n\nTrendoTalk - Connect, Share, Trend`
          });
          
          console.log(`Email sent successfully to ${email} via SendGrid`);
        } catch (emailError) {
          console.error('SendGrid email error:', emailError);
          console.error('SendGrid error details:', JSON.stringify(emailError, null, 2));
          console.log(`Email OTP for ${email}: ${otp}`); // Fallback logging
        }
      } else {
        console.log(`No SendGrid API key found. Email OTP for ${email}: ${otp}`);
      }
      
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending email OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify email OTP
  app.post('/api/account/verify-email-otp', authenticateUser, async (req: any, res: any) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ message: 'Email and OTP required' });
      }

      // Check stored OTP
      const otpKey = `email_otp_${req.user.userId}`;
      const storedData = (global as any)[otpKey];
      
      if (!storedData || storedData.expires < Date.now()) {
        return res.status(400).json({ message: 'OTP expired' });
      }
      
      if (storedData.otp !== otp || storedData.email !== email) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
      
      // Mark email as verified
      await storage.updateUser(req.user.userId, { 
        email, 
        emailVerified: true 
      });
      
      // Clear OTP
      delete (global as any)[otpKey];
      
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Error verifying email OTP:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get CV data
  app.get('/api/cv', authenticateUser, async (req: any, res: any) => {
    try {
      const cvData = await storage.getUserCV(req.user.userId);
      res.json(cvData);
    } catch (error) {
      console.error('Error getting CV:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get other user's CV data
  app.get('/api/users/:userId/cv', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const cvData = await storage.getUserCV(userId);
      res.json(cvData);
    } catch (error) {
      console.error('Error getting user CV:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Save CV data
  app.post('/api/cv', authenticateUser, async (req: any, res: any) => {
    try {
      const cvData = req.body;
      const savedCV = await storage.saveUserCV(req.user.userId, cvData);
      res.json(savedCV);
    } catch (error) {
      console.error('Error saving CV:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user performance statistics
  app.get('/api/performance-stats', authenticateUser, async (req: any, res: any) => {
    try {
      const stats = await storage.getUserPerformanceStats(req.user.userId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting performance stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get other user's performance statistics
  app.get('/api/users/:userId/performance-stats', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const stats = await storage.getUserPerformanceStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting user performance stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Circle timeline message system (completely separate from DM system)
  // Get Circle timeline messages (public timeline from user's friends)
  app.get('/api/circle/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;
      
      // Get user's following list
      const following = await storage.getUserFollowing(userId);
      const followingIds = following.map(f => f.id);
      followingIds.push(userId); // Include user's own messages
      
      // Get Circle messages from followed users + user's own messages
      const messages = await db
        .select({
          id: circleMessages.id,
          content: circleMessages.content,
          imageUrl: circleMessages.imageUrl,
          videoUrl: circleMessages.videoUrl,
          likesCount: circleMessages.likesCount,
          commentsCount: circleMessages.commentsCount,
          isPublic: circleMessages.isPublic,
          createdAt: circleMessages.createdAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar
          }
        })
        .from(circleMessages)
        .leftJoin(users, eq(circleMessages.userId, users.id))
        .where(
          and(
            eq(circleMessages.isPublic, true),
            inArray(circleMessages.userId, followingIds)
          )
        )
        .orderBy(desc(circleMessages.createdAt))
        .limit(50);

      res.json(messages);
    } catch (error) {
      console.error('Error getting Circle messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Post a new Circle timeline message
  app.post('/api/circle/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const { content, imageUrl, videoUrl, isPublic = true } = req.body;
      const userId = req.user.userId;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      const [newMessage] = await db
        .insert(circleMessages)
        .values({
          userId,
          content: content.trim(),
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          isPublic
        })
        .returning();

      // Get the message with user info for response
      const messageWithUser = await db
        .select({
          id: circleMessages.id,
          content: circleMessages.content,
          imageUrl: circleMessages.imageUrl,
          videoUrl: circleMessages.videoUrl,
          likesCount: circleMessages.likesCount,
          commentsCount: circleMessages.commentsCount,
          isPublic: circleMessages.isPublic,
          createdAt: circleMessages.createdAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar
          }
        })
        .from(circleMessages)
        .leftJoin(users, eq(circleMessages.userId, users.id))
        .where(eq(circleMessages.id, newMessage.id));

      res.json(messageWithUser[0]);
    } catch (error) {
      console.error('Error creating Circle message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Like/Unlike a Circle message
  app.post('/api/circle/messages/:messageId/like', authenticateUser, async (req: any, res: any) => {
    try {
      const messageId = Number(req.params.messageId);
      const userId = req.user.userId;

      // Check if already liked
      const existingLike = await db
        .select()
        .from(circleMessageLikes)
        .where(
          and(
            eq(circleMessageLikes.messageId, messageId),
            eq(circleMessageLikes.userId, userId)
          )
        );

      if (existingLike.length > 0) {
        // Unlike - remove like and decrement count
        await db
          .delete(circleMessageLikes)
          .where(
            and(
              eq(circleMessageLikes.messageId, messageId),
              eq(circleMessageLikes.userId, userId)
            )
          );

        await db
          .update(circleMessages)
          .set({ 
            likesCount: sql`${circleMessages.likesCount} - 1` 
          })
          .where(eq(circleMessages.id, messageId));

        res.json({ liked: false });
      } else {
        // Like - add like and increment count
        await db
          .insert(circleMessageLikes)
          .values({ messageId, userId });

        await db
          .update(circleMessages)
          .set({ 
            likesCount: sql`${circleMessages.likesCount} + 1` 
          })
          .where(eq(circleMessages.id, messageId));

        res.json({ liked: true });
      }
    } catch (error) {
      console.error('Error toggling Circle message like:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get comments for a Circle message
  app.get('/api/circle/messages/:messageId/comments', authenticateUser, async (req: any, res: any) => {
    try {
      const messageId = Number(req.params.messageId);

      const comments = await db
        .select({
          id: circleMessageComments.id,
          content: circleMessageComments.content,
          createdAt: circleMessageComments.createdAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar
          }
        })
        .from(circleMessageComments)
        .leftJoin(users, eq(circleMessageComments.userId, users.id))
        .where(eq(circleMessageComments.messageId, messageId))
        .orderBy(circleMessageComments.createdAt);

      res.json(comments);
    } catch (error) {
      console.error('Error getting Circle message comments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Add a comment to a Circle message
  app.post('/api/circle/messages/:messageId/comments', authenticateUser, async (req: any, res: any) => {
    try {
      const messageId = Number(req.params.messageId);
      const { content } = req.body;
      const userId = req.user.userId;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment content is required' });
      }

      const [newComment] = await db
        .insert(circleMessageComments)
        .values({
          messageId,
          userId,
          content: content.trim()
        })
        .returning();

      // Increment comments count on the message
      await db
        .update(circleMessages)
        .set({ 
          commentsCount: sql`${circleMessages.commentsCount} + 1` 
        })
        .where(eq(circleMessages.id, messageId));

      // Get the comment with user info for response
      const commentWithUser = await db
        .select({
          id: circleMessageComments.id,
          content: circleMessageComments.content,
          createdAt: circleMessageComments.createdAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatar: users.avatar
          }
        })
        .from(circleMessageComments)
        .leftJoin(users, eq(circleMessageComments.userId, users.id))
        .where(eq(circleMessageComments.id, newComment.id));

      res.json(commentWithUser[0]);
    } catch (error) {
      console.error('Error creating Circle message comment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Notification API endpoints
  app.get('/api/notifications', authenticateUser, async (req: any, res: any) => {
    try {
      const notifications = await storage.getUserNotifications(req.user.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/notifications/count', authenticateUser, async (req: any, res: any) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.userId);
      res.json({ count });
    } catch (error) {
      console.error('Error getting notification count:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/notifications/:id/read', authenticateUser, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const success = await storage.markNotificationAsRead(parseInt(id));
      res.json({ success });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/notifications/read-all', authenticateUser, async (req: any, res: any) => {
    try {
      const success = await storage.markAllNotificationsAsRead(req.user.userId);
      res.json({ success });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
