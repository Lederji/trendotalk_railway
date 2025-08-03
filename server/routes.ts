import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm|pdf|doc|docx|txt|xlsx|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/|video\/|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument|text\/plain/.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and documents are allowed.'));
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

  // General file upload endpoint
  app.post('/api/upload', authenticateUser, upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const cloudinaryUrl = await uploadToCloudinary(req.file);
      
      res.json({ url: cloudinaryUrl });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ message: 'File upload failed' });
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
      console.log(`=== FRIEND REQUEST ROUTE ===`);
      console.log(`From user: ${req.user.userId}, To user: ${targetUserId}`);
      console.log(`Target user ID type: ${typeof targetUserId}, value: ${targetUserId}`);
      
      const success = await storage.sendFriendRequest(req.user.userId, targetUserId);
      console.log(`Friend request result: ${success}`);
      
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

  // Get user by username
  app.get('/api/users/username/:username', authenticateUser, async (req: any, res: any) => {
    try {
      const username = req.params.username;
      console.log('✓ USERNAME ROUTE called for username:', username, 'Session userId:', req.user.userId);
      
      const user = await storage.getUserByUsername(username);
      console.log('✓ User found in USERNAME route:', user ? 'Yes' : 'No', user?.username, 'Followers:', user?.followersCount, 'Following:', user?.followingCount);
      if (!user) {
        console.log('✓ User not found in USERNAME route, returning 404');
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if current user is following this user
      let isFollowing = false;
      if (req.user.userId !== user.id) {
        isFollowing = await storage.isFollowing(req.user.userId, user.id);
      }
      
      // Get user's posts
      const posts = await storage.getUserPosts(user.id);
      
      // Calculate follower counts excluding admin users
      const followers = await storage.getUserFollowers(user.id);
      const following = await storage.getUserFollowing(user.id);
      
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
      console.error('Error getting user profile by username:', error);
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

  // Create DM request (separate from Circle messaging)
  app.post('/api/dm/create', authenticateUser, async (req: any, res: any) => {
    try {
      const { userId, message } = req.body;
      const targetUserId = Number(userId);
      
      if (!targetUserId || targetUserId === req.user.userId) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message is required' });
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is blocked
      const blockResult = await db.execute(sql`
        SELECT * FROM dm_blocks 
        WHERE blocker_id = ${targetUserId} AND blocked_id = ${req.user.userId}
        AND (block_type = 'permanent' OR (block_type = 'temporary' AND expires_at > NOW()))
      `);
      
      if (blockResult.rows && blockResult.rows.length > 0) {
        const block = blockResult.rows[0] as any;
        if (block.block_type === 'permanent') {
          return res.status(403).json({ 
            message: 'You are blocked for DM',
            isBlocked: true,
            blockType: 'permanent'
          });
        } else {
          return res.status(403).json({ 
            message: 'You cannot send messages to this user for 72 hours after being dismissed',
            isBlocked: true,
            blockType: 'temporary'
          });
        }
      }
      
      // Check if chat already exists (accepted request)
      const existingChatResult = await db.execute(sql`
        SELECT id FROM dm_chats 
        WHERE (user1_id = ${req.user.userId} AND user2_id = ${targetUserId})
           OR (user1_id = ${targetUserId} AND user2_id = ${req.user.userId})
        LIMIT 1
      `);
      
      if (existingChatResult.rows && existingChatResult.rows.length > 0) {
        return res.json({ chatId: (existingChatResult.rows[0] as any).id, exists: true });
      }
      
      // Check if request already exists
      const existingRequestResult = await db.execute(sql`
        SELECT id, status FROM dm_requests 
        WHERE from_user_id = ${req.user.userId} AND to_user_id = ${targetUserId}
        AND status IN ('pending', 'dismissed')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      if (existingRequestResult.rows && existingRequestResult.rows.length > 0) {
        const request = existingRequestResult.rows[0] as any;
        if (request.status === 'dismissed') {
          // For dismissed users, redirect to existing chat room
          const existingDismissedChatResult = await db.execute(sql`
            SELECT id FROM dm_chats 
            WHERE (user1_id = ${req.user.userId} AND user2_id = ${targetUserId})
               OR (user1_id = ${targetUserId} AND user2_id = ${req.user.userId})
            LIMIT 1
          `);
          
          if (existingDismissedChatResult.rows && existingDismissedChatResult.rows.length > 0) {
            const existingChat = existingDismissedChatResult.rows[0] as any;
            return res.json({ chatId: existingChat.id, exists: true, wasDismissed: true });
          }
          
          return res.status(403).json({ message: 'You cannot send another request to this user yet' });
        }
        
        // Find the chat ID for this existing request
        const existingChatForRequestResult = await db.execute(sql`
          SELECT id FROM dm_chats 
          WHERE (user1_id = ${req.user.userId} AND user2_id = ${targetUserId})
             OR (user1_id = ${targetUserId} AND user2_id = ${req.user.userId})
          LIMIT 1
        `);
        
        if (existingChatForRequestResult.rows && existingChatForRequestResult.rows.length > 0) {
          const chatId = (existingChatForRequestResult.rows[0] as any).id;
          return res.json({ requestId: request.id, chatId, exists: true });
        }
        
        // Chat doesn't exist for this request, create it now
        const newChatForExistingRequestResult = await db.execute(sql`
          INSERT INTO dm_chats (user1_id, user2_id) 
          VALUES (${req.user.userId}, ${targetUserId}) 
          RETURNING id
        `);
        
        const newChatForExistingRequest = newChatForExistingRequestResult.rows[0] as any;
        
        // Add the first message to the chat
        await db.execute(sql`
          INSERT INTO dm_messages (chat_id, sender_id, content) 
          VALUES (${newChatForExistingRequest.id}, ${req.user.userId}, ${request.first_message})
        `);
        
        return res.json({ requestId: request.id, chatId: newChatForExistingRequest.id, exists: true });
      }
      
      // Create only DM request - no chat until approved
      const newRequestResult = await db.execute(sql`
        INSERT INTO dm_requests (from_user_id, to_user_id, first_message) 
        VALUES (${req.user.userId}, ${targetUserId}, ${message.trim()}) 
        RETURNING id
      `);
      
      const newRequest = newRequestResult.rows[0] as any;
      
      res.json({ 
        requestId: newRequest.id,
        exists: false,
        message: 'Request sent successfully'
      });
    } catch (error) {
      console.error('Error creating DM request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Mark DM messages as read
  app.post('/api/dm/:chatId/mark-read', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const userId = req.user.userId;
      
      // Verify user has access to this chat
      const chatResult = await db.execute(sql`
        SELECT * FROM dm_chats 
        WHERE id = ${chatId} 
        AND (user1_id = ${userId} OR user2_id = ${userId})
      `);
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      // Mark all messages in this chat as read for this user
      // We'll use a simple approach - update chat's last_read timestamp for user
      const chat = chatResult.rows[0] as any;
      
      if (chat.user1_id === userId) {
        await db.execute(sql`
          UPDATE dm_chats 
          SET user1_last_read = NOW() 
          WHERE id = ${chatId}
        `);
      } else {
        await db.execute(sql`
          UPDATE dm_chats 
          SET user2_last_read = NOW() 
          WHERE id = ${chatId}
        `);
      }
      
      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get DM chat status (check if messages are restricted)
  app.get('/api/dm/chats/:chatId/status', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const userId = req.user.userId;
      
      // Check if user has access to this chat
      const chatResult = await db.execute(sql`
        SELECT * FROM dm_chats 
        WHERE id = ${chatId} 
        AND (user1_id = ${userId} OR user2_id = ${userId})
      `);
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      const chat = chatResult.rows[0] as any;
      const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
      
      // Check if user is blocked (72-hour cooldown from dismiss action)
      const blockResult = await db.execute(sql`
        SELECT * FROM dm_blocks 
        WHERE blocker_id = ${otherUserId} AND blocked_id = ${userId}
        AND (block_type = 'permanent' OR (block_type = 'temporary' AND expires_at > NOW()))
      `);
      
      const isBlocked = blockResult.rows && blockResult.rows.length > 0;
      const blockInfo = blockResult.rows?.[0] as any;
      
      // Check for any DM requests between these users (including dismissed)
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE ((from_user_id = ${userId} AND to_user_id = ${otherUserId}) 
               OR (from_user_id = ${otherUserId} AND to_user_id = ${userId}))
        AND status IN ('pending', 'dismissed')
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      // Count messages sent by current user in this chat
      const messageCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM dm_messages 
        WHERE chat_id = ${chatId} AND sender_id = ${userId}
      `);
      
      const messageCount = Number(messageCountResult.rows?.[0]?.count || 0);
      const hasRequest = requestResult.rows && requestResult.rows.length > 0;
      const request = requestResult.rows?.[0];
      
      // Determine restriction type
      const wasDismissed = hasRequest && request?.status === 'dismissed' && request?.from_user_id === userId;
      const hasPendingRequest = hasRequest && request?.status === 'pending';
      
      // If current user sent the request and has already sent 1+ messages, restrict further messages
      const isRestricted = (hasPendingRequest && request?.from_user_id === userId && messageCount >= 1) || isBlocked;
      
      res.json({
        isRestricted,
        isBlocked,
        wasDismissed,
        blockType: blockInfo?.block_type,
        blockExpiresAt: blockInfo?.expires_at,
        messageCount,
        hasPendingRequest,
        pendingRequestFrom: request?.from_user_id
      });
    } catch (error) {
      console.error('Error getting DM chat status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Get DM requests for current user
  app.get('/api/dm/requests', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;
      
      const requestsResult = await db.execute(sql`
        SELECT dr.*, 
               u.username, u.avatar, u.display_name
        FROM dm_requests dr
        JOIN users u ON dr.from_user_id = u.id
        WHERE dr.to_user_id = ${userId} AND dr.status = 'pending'
        ORDER BY dr.created_at DESC
      `);
      
      const requests = requestsResult.rows?.map((request: any) => ({
        id: request.id,
        fromUser: {
          id: request.from_user_id,
          username: request.username,
          avatar: request.avatar,
          displayName: request.display_name
        },
        firstMessage: request.first_message,
        createdAt: request.created_at
      })) || [];
      
      res.json(requests);
    } catch (error) {
      console.error('Error getting DM requests:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Handle DM request actions (allow, dismiss, block)
  app.post('/api/dm/requests/:requestId/allow', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      
      // Get the request
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE id = ${requestId} AND to_user_id = ${req.user.userId} AND status = 'pending'
      `);
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      const request = requestResult.rows[0] as any;
      
      // Check if chat already exists
      const existingChatResult = await db.execute(sql`
        SELECT id FROM dm_chats 
        WHERE (user1_id = ${request.from_user_id} AND user2_id = ${req.user.userId})
           OR (user1_id = ${req.user.userId} AND user2_id = ${request.from_user_id})
      `);
      
      let chatId;
      if (existingChatResult.rows && existingChatResult.rows.length > 0) {
        // Use existing chat
        chatId = (existingChatResult.rows[0] as any).id;
      } else {
        // Create new chat
        const chatResult = await db.execute(sql`
          INSERT INTO dm_chats (user1_id, user2_id) 
          VALUES (${request.from_user_id}, ${req.user.userId}) 
          RETURNING id
        `);
        chatId = (chatResult.rows[0] as any).id;
        
        // Add the first message to new chat
        await db.execute(sql`
          INSERT INTO dm_messages (chat_id, sender_id, content) 
          VALUES (${chatId}, ${request.from_user_id}, ${request.first_message})
        `);
      }
      
      // Add system messages to move this chat to Messages tab (4+ messages required)
      await db.execute(sql`
        INSERT INTO dm_messages (chat_id, sender_id, content) 
        VALUES 
        (${chatId}, ${req.user.userId}, 'Message request accepted'),
        (${chatId}, ${req.user.userId}, 'You can now chat freely'),
        (${chatId}, ${req.user.userId}, 'Start your conversation!')
      `);
      
      // Update request status to accepted
      await db.execute(sql`
        UPDATE dm_requests 
        SET status = 'accepted', updated_at = NOW() 
        WHERE id = ${requestId}
      `);
      
      res.json({ success: true, message: 'Request accepted', chatId: chatId });
    } catch (error) {
      console.error('Error accepting DM request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/dm/requests/:requestId/dismiss', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      
      // Get the request
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE id = ${requestId} AND to_user_id = ${req.user.userId} AND status = 'pending'
      `);
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      const request = requestResult.rows[0] as any;
      
      // Update request status to dismissed
      await db.execute(sql`
        UPDATE dm_requests 
        SET status = 'dismissed', updated_at = NOW() 
        WHERE id = ${requestId}
      `);
      
      // Add temporary block for 72 hours
      await db.execute(sql`
        INSERT INTO dm_blocks (blocker_id, blocked_id, block_type, expires_at) 
        VALUES (${req.user.userId}, ${request.from_user_id}, 'temporary', NOW() + INTERVAL '72 hours')
      `);
      
      res.json({ success: true, message: 'Request dismissed' });
    } catch (error) {
      console.error('Error dismissing DM request:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/dm/requests/:requestId/block', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      
      // Get the request
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE id = ${requestId} AND to_user_id = ${req.user.userId} AND status = 'pending'
      `);
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      const request = requestResult.rows[0] as any;
      
      // Update request status to blocked
      await db.execute(sql`
        UPDATE dm_requests 
        SET status = 'blocked', updated_at = NOW() 
        WHERE id = ${requestId}
      `);
      
      // Add permanent block
      await db.execute(sql`
        INSERT INTO dm_blocks (blocker_id, blocked_id, block_type) 
        VALUES (${req.user.userId}, ${request.from_user_id}, 'permanent')
      `);
      
      res.json({ success: true, message: 'User blocked' });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Handle DM request actions (allow, dismiss, block) - legacy endpoint
  app.post('/api/dm/requests/:requestId/action', authenticateUser, async (req: any, res: any) => {
    try {
      const requestId = Number(req.params.requestId);
      const { action } = req.body; // allow, dismiss, block
      
      if (!['allow', 'dismiss', 'block'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }
      
      // Get the request
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE id = ${requestId} AND to_user_id = ${req.user.userId} AND status = 'pending'
      `);
      
      if (!requestResult.rows || requestResult.rows.length === 0) {
        return res.status(404).json({ message: 'Request not found' });
      }
      
      const request = requestResult.rows[0] as any;
      
      if (action === 'allow') {
        // Create chat and move first message
        const chatResult = await db.execute(sql`
          INSERT INTO dm_chats (user1_id, user2_id) 
          VALUES (${request.from_user_id}, ${req.user.userId}) 
          RETURNING id
        `);
        
        const chat = chatResult.rows[0] as any;
        
        // Add first message to the chat
        await db.execute(sql`
          INSERT INTO dm_messages (chat_id, sender_id, content) 
          VALUES (${chat.id}, ${request.from_user_id}, ${request.first_message})
        `);
        
        // Update request status
        await db.execute(sql`
          UPDATE dm_requests 
          SET status = 'accepted', updated_at = NOW() 
          WHERE id = ${requestId}
        `);
        
        res.json({ chatId: chat.id, success: true });
      } else if (action === 'dismiss') {
        // Dismiss for 72 hours
        await db.execute(sql`
          UPDATE dm_requests 
          SET status = 'dismissed', updated_at = NOW() 
          WHERE id = ${requestId}
        `);
        
        // Create chat so sender can see it but cannot send more messages
        const chatResult = await db.execute(sql`
          INSERT INTO dm_chats (user1_id, user2_id) 
          VALUES (${request.from_user_id}, ${req.user.userId}) 
          RETURNING id
        `);
        
        const chat = chatResult.rows[0] as any;
        
        // Add the original message to the chat
        await db.execute(sql`
          INSERT INTO dm_messages (chat_id, sender_id, content) 
          VALUES (${chat.id}, ${request.from_user_id}, ${request.first_message})
        `);
        
        // Add system message indicating dismissal
        await db.execute(sql`
          INSERT INTO dm_messages (chat_id, sender_id, content) 
          VALUES (${chat.id}, ${req.user.userId}, 'Message request dismissed')
        `);
        
        // Add temporary block
        await db.execute(sql`
          INSERT INTO dm_blocks (blocker_id, blocked_id, block_type, expires_at) 
          VALUES (${req.user.userId}, ${request.from_user_id}, 'temporary', NOW() + INTERVAL '72 hours')
        `);
        
        res.json({ success: true, chatId: chat.id });
      } else if (action === 'block') {
        // Permanent block - delete the chat completely
        await db.execute(sql`
          UPDATE dm_requests 
          SET status = 'blocked', updated_at = NOW() 
          WHERE id = ${requestId}
        `);
        
        // Delete any existing chat between these users
        await db.execute(sql`
          DELETE FROM dm_messages 
          WHERE chat_id IN (
            SELECT id FROM dm_chats 
            WHERE (user1_id = ${req.user.userId} AND user2_id = ${request.from_user_id})
               OR (user1_id = ${request.from_user_id} AND user2_id = ${req.user.userId})
          )
        `);
        
        await db.execute(sql`
          DELETE FROM dm_chats 
          WHERE (user1_id = ${req.user.userId} AND user2_id = ${request.from_user_id})
             OR (user1_id = ${request.from_user_id} AND user2_id = ${req.user.userId})
        `);
        
        // Add permanent block
        await db.execute(sql`
          INSERT INTO dm_blocks (blocker_id, blocked_id, block_type) 
          VALUES (${req.user.userId}, ${request.from_user_id}, 'permanent')
        `);
        
        res.json({ success: true });
      }
    } catch (error) {
      console.error('Error handling DM request action:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get total unread DM count for home page messages icon
  app.get('/api/dm/unread-count', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;
      
      // Get unread count from ongoing chats (Messages tab) - count chats with unread messages
      const ongoingChatsResult = await db.execute(sql`
        SELECT dc.id, dc.user1_id, dc.user1_last_read, dc.user2_last_read
        FROM dm_chats dc
        WHERE (dc.user1_id = ${userId} OR dc.user2_id = ${userId})
        AND (SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id) > 3
      `);
      
      let ongoingUnreadCount = 0;
      for (const chat of ongoingChatsResult.rows || []) {
        const userLastRead = chat.user1_id === userId ? chat.user1_last_read : chat.user2_last_read;
        
        let hasUnreadMessages = false;
        if (userLastRead) {
          // Check if there are messages after the last read timestamp
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
            AND created_at > ${userLastRead}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        } else {
          // If never read, check if there are any messages from others
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        }
        
        if (hasUnreadMessages) {
          ongoingUnreadCount += 1; // Count 1 per chat with unread messages
        }
      }
      
      // Get unread count from new chats (Requests tab) - count chats with unread messages
      const newChatsResult = await db.execute(sql`
        SELECT dc.id, dc.user1_id, dc.user1_last_read, dc.user2_last_read
        FROM dm_chats dc
        WHERE (dc.user1_id = ${userId} OR dc.user2_id = ${userId})
        AND (SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id) <= 3
      `);
      
      let newChatsUnreadCount = 0;
      for (const chat of newChatsResult.rows || []) {
        const userLastRead = chat.user1_id === userId ? chat.user1_last_read : chat.user2_last_read;
        
        let hasUnreadMessages = false;
        if (userLastRead) {
          // Check if there are messages after the last read timestamp
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
            AND created_at > ${userLastRead}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        } else {
          // If never read, check if there are any messages from others
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        }
        
        if (hasUnreadMessages) {
          newChatsUnreadCount += 1; // Count 1 per chat with unread messages
        }
      }
      
      // Get pending DM requests count
      const dmRequestsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM dm_requests 
        WHERE to_user_id = ${userId} AND status = 'pending'
      `);
      const dmRequestsCount = Number(dmRequestsResult.rows?.[0]?.count || 0);
      
      // Get pending message requests count
      const messageRequestsResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM message_requests 
        WHERE to_user_id = ${userId} AND status = 'pending'
      `);
      const messageRequestsCount = Number(messageRequestsResult.rows?.[0]?.count || 0);
      
      const totalUnreadCount = ongoingUnreadCount + newChatsUnreadCount + dmRequestsCount + messageRequestsCount;
      
      res.json({ 
        totalUnreadCount,
        messagesTabCount: ongoingUnreadCount,
        requestsTabCount: newChatsUnreadCount + dmRequestsCount + messageRequestsCount
      });
    } catch (error) {
      console.error('Error getting unread DM count:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get new/short DM conversations for Requests tab 
  app.get('/api/dm-new-chats', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = req.user.userId;
      
      // Get new DM chats (3 or fewer messages) for Requests tab
      const newChatsResult = await db.execute(sql`
        SELECT dc.id, dc.user1_id, dc.user2_id, dc.created_at, dc.updated_at,
               dc.user1_last_read, dc.user2_last_read,
               u1.username as user1_username, u1.avatar as user1_avatar, u1.display_name as user1_display_name,
               u2.username as user2_username, u2.avatar as user2_avatar, u2.display_name as user2_display_name,
               (SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id) as message_count
        FROM dm_chats dc
        JOIN users u1 ON dc.user1_id = u1.id
        JOIN users u2 ON dc.user2_id = u2.id
        WHERE (dc.user1_id = ${userId} OR dc.user2_id = ${userId})
        AND (
          SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id
        ) <= 3
        ORDER BY dc.updated_at DESC
      `);
      
      const newChats = await Promise.all(newChatsResult.rows?.map(async (chat: any) => {
        const otherUser = chat.user1_id === userId ? 
          { 
            id: chat.user2_id, 
            username: chat.user2_username, 
            avatar: chat.user2_avatar,
            displayName: chat.user2_display_name 
          } :
          { 
            id: chat.user1_id, 
            username: chat.user1_username, 
            avatar: chat.user1_avatar,
            displayName: chat.user1_display_name 
          };

        // Calculate unread messages for this chat
        const userLastRead = chat.user1_id === userId ? chat.user1_last_read : chat.user2_last_read;
        let hasUnreadMessages = false;
        
        if (userLastRead) {
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
            AND created_at > ${userLastRead}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        } else {
          const unreadResult = await db.execute(sql`
            SELECT COUNT(*) as count FROM dm_messages 
            WHERE chat_id = ${chat.id} 
            AND sender_id != ${userId}
          `);
          hasUnreadMessages = Number(unreadResult.rows?.[0]?.count || 0) > 0;
        }
        
        return {
          id: chat.id,
          user: otherUser,
          messageCount: Number(chat.message_count || 0),
          hasUnreadMessages,
          lastMessage: null,
          lastMessageTime: null,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at
        };
      }) || []);
      
      res.json(newChats);
    } catch (error) {
      console.error('Error getting new DM chats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all DM chats for a user (must be before parameterized route)
  app.get('/api/dm/chats', authenticateUser, async (req: any, res: any) => {
    try {
      console.log('DM chats endpoint called - req.user:', req.user);
      const userId = req.user.userId;
      console.log('DM chats - authenticated userId:', userId, 'type:', typeof userId);
      
      // Get ongoing DM chats (more than 3 messages) for Messages tab
      const dmChatsResult = await db.execute(sql`
        SELECT dc.id, dc.user1_id, dc.user2_id, dc.created_at, dc.updated_at,
               dc.user1_last_read, dc.user2_last_read,
               u1.username as user1_username, u1.avatar as user1_avatar, u1.display_name as user1_display_name,
               u2.username as user2_username, u2.avatar as user2_avatar, u2.display_name as user2_display_name,
               (SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id) as total_messages
        FROM dm_chats dc
        JOIN users u1 ON dc.user1_id = u1.id
        JOIN users u2 ON dc.user2_id = u2.id
        WHERE (dc.user1_id = ${userId} OR dc.user2_id = ${userId})
        AND (
          SELECT COUNT(*) FROM dm_messages dm WHERE dm.chat_id = dc.id
        ) > 3
        ORDER BY dc.updated_at DESC
      `);
      
      const chats = await Promise.all(dmChatsResult.rows?.map(async (chat: any) => {
        const otherUser = chat.user1_id === userId ? 
          { 
            id: chat.user2_id, 
            username: chat.user2_username, 
            avatar: chat.user2_avatar,
            displayName: chat.user2_display_name 
          } :
          { 
            id: chat.user1_id, 
            username: chat.user1_username, 
            avatar: chat.user1_avatar,
            displayName: chat.user1_display_name 
          };

        // Calculate unread count - messages received after user's last read time
        const userLastRead = chat.user1_id === userId ? chat.user1_last_read : chat.user2_last_read;
        const unreadCountResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM dm_messages 
          WHERE chat_id = ${chat.id} 
          AND sender_id != ${userId}
          AND created_at > COALESCE(${userLastRead}, '1970-01-01'::timestamp)
        `);
        const unreadCount = Number(unreadCountResult.rows?.[0]?.count || 0);
        
        return {
          id: chat.id,
          user: otherUser,
          lastMessage: "Start a conversation",
          lastMessageTime: null,
          unreadCount: unreadCount,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at
        };
      }) || []);
      
      console.log('DM chats found:', chats.length);
      res.json(chats);
    } catch (error) {
      console.error('Error getting DM chats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get DM chat details
  app.get('/api/dm/:chatId', authenticateUser, async (req: any, res: any) => {
    try {
      console.log('DM chat details - req.params.chatId:', req.params.chatId, 'type:', typeof req.params.chatId);
      const chatId = Number(req.params.chatId);
      console.log('DM chat details - converted chatId:', chatId, 'isNaN:', isNaN(chatId));
      
      if (!req.user || !req.user.userId) {
        console.log('DM chat details - authentication failed, req.user:', req.user);
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      console.log('DM chat details - req.user.userId:', req.user.userId, 'type:', typeof req.user.userId);
      const userId = Number(req.user.userId);
      console.log('DM chat details - converted userId:', userId, 'isNaN:', isNaN(userId));
      
      const chatResult = await db.execute(sql`
        SELECT dc.*, 
               u1.username as user1_username, u1.avatar as user1_avatar, u1.display_name as user1_display_name,
               u2.username as user2_username, u2.avatar as user2_avatar, u2.display_name as user2_display_name
        FROM dm_chats dc
        JOIN users u1 ON dc.user1_id = u1.id
        JOIN users u2 ON dc.user2_id = u2.id
        WHERE dc.id = ${chatId} 
        AND (dc.user1_id = ${userId} OR dc.user2_id = ${userId})
      `);
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }
      
      const chat = chatResult.rows[0] as any;
      const otherUser = chat.user1_id === req.user.userId ? 
        { id: chat.user2_id, username: chat.user2_username, avatar: chat.user2_avatar, displayName: chat.user2_display_name } :
        { id: chat.user1_id, username: chat.user1_username, avatar: chat.user1_avatar, displayName: chat.user1_display_name };
      
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
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
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
      
      res.json(messagesResult.rows || []);
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
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      const chat = chatResult.rows[0] as any;
      const otherUserId = chat.user1_id === req.user.userId ? chat.user2_id : chat.user1_id;
      
      // Check if user is blocked (72-hour cooldown from dismiss action)
      const blockResult = await db.execute(sql`
        SELECT * FROM dm_blocks 
        WHERE blocker_id = ${otherUserId} AND blocked_id = ${req.user.userId}
        AND (block_type = 'permanent' OR (block_type = 'temporary' AND expires_at > NOW()))
      `);
      
      if (blockResult.rows && blockResult.rows.length > 0) {
        const block = blockResult.rows[0] as any;
        if (block.block_type === 'temporary') {
          return res.status(403).json({ 
            message: 'You cannot send messages to this user for 72 hours after being dismissed',
            isBlocked: true,
            blockType: 'temporary',
            expiresAt: block.expires_at
          });
        } else {
          return res.status(403).json({ 
            message: 'You cannot send messages to this user',
            isBlocked: true,
            blockType: 'permanent'
          });
        }
      }
      
      // Check for dismissed request that may allow one new message after cooldown
      const dismissedRequestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE from_user_id = ${req.user.userId} AND to_user_id = ${otherUserId}
        AND status = 'dismissed'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      // Check if there's a pending DM request that restricts messaging
      const requestResult = await db.execute(sql`
        SELECT * FROM dm_requests 
        WHERE from_user_id = ${req.user.userId} AND to_user_id = ${otherUserId}
        AND status = 'pending'
      `);
      
      // Count messages sent by current user in this chat
      const messageCountResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM dm_messages 
        WHERE chat_id = ${chatId} AND sender_id = ${req.user.userId}
      `);
      
      const messageCount = Number(messageCountResult.rows?.[0]?.count || 0);
      const hasPendingRequest = requestResult.rows && requestResult.rows.length > 0;
      const hasDismissedRequest = dismissedRequestResult.rows && dismissedRequestResult.rows.length > 0;
      
      // If user sent the request and has already sent 1+ messages, restrict further messages
      if (hasPendingRequest && messageCount >= 1) {
        return res.status(403).json({ 
          message: 'You can only send one message until the recipient accepts your request',
          isRestricted: true 
        });
      }
      
      // If user was dismissed and 72-hour cooldown has expired, allow only one new message
      if (hasDismissedRequest && !hasPendingRequest) {
        // Count messages sent after the dismissal
        const dismissedRequest = dismissedRequestResult.rows[0] as any;
        const messagesAfterDismissalResult = await db.execute(sql`
          SELECT COUNT(*) as count FROM dm_messages 
          WHERE chat_id = ${chatId} 
          AND sender_id = ${req.user.userId}
          AND created_at > ${dismissedRequest.updated_at}
        `);
        
        const messagesAfterDismissal = Number(messagesAfterDismissalResult.rows?.[0]?.count || 0);
        
        // If user already sent a message after dismissal, block further messages
        if (messagesAfterDismissal >= 1) {
          return res.status(403).json({
            message: 'You can only send one message after being dismissed. Wait for a response.',
            isRestricted: true
          });
        }
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
      
      const newMessage = messageResult.rows[0] as any;
      res.json(newMessage);
    } catch (error) {
      console.error('Error sending DM message:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Block user from DM chat header
  app.post('/api/dm/chats/:chatId/block', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      
      // Verify user has access to this chat
      const chatResult = await db.execute(sql`
        SELECT * FROM dm_chats 
        WHERE id = ${chatId} 
        AND (user1_id = ${req.user.userId} OR user2_id = ${req.user.userId})
      `);
      
      if (!chatResult.rows || chatResult.rows.length === 0) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      const chat = chatResult.rows[0] as any;
      const otherUserId = chat.user1_id === req.user.userId ? chat.user2_id : chat.user1_id;
      
      // Check if block already exists
      const existingBlockResult = await db.execute(sql`
        SELECT * FROM dm_blocks 
        WHERE blocker_id = ${req.user.userId} AND blocked_id = ${otherUserId}
      `);

      if (existingBlockResult.rows && existingBlockResult.rows.length > 0) {
        // Update existing block to permanent
        await db.execute(sql`
          UPDATE dm_blocks 
          SET block_type = 'permanent', expires_at = NULL 
          WHERE blocker_id = ${req.user.userId} AND blocked_id = ${otherUserId}
        `);
      } else {
        // Add new permanent block
        await db.execute(sql`
          INSERT INTO dm_blocks (blocker_id, blocked_id, block_type) 
          VALUES (${req.user.userId}, ${otherUserId}, 'permanent')
        `);
      }

      res.json({ success: true, message: 'User blocked permanently' });
    } catch (error) {
      console.error('Error blocking user from chat:', error);
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
      const messages = await storage.getCircleMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error('Error getting Circle messages:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Post a new Circle timeline message
  app.post('/api/circle/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const { content, imageUrl, videoUrl } = req.body;
      const userId = req.user.userId;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      const newMessage = await storage.createCircleMessage(userId, content, imageUrl, videoUrl);
      res.json(newMessage);
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

      const result = await storage.toggleCircleMessageLike(messageId, userId);
      res.json(result);
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
  
  // WebSocket server for audio calls
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections and ongoing calls
  const connections = new Map<string, { ws: WebSocket, userId: string, username: string }>();
  const activeCalls = new Map<string, { caller: string, callee: string, callId: string }>();
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket client connected for calls');
    
    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data.type);
        
        switch (data.type) {
          case 'register':
            // Register user connection
            if (data.userId && data.username) {
              connections.set(data.userId, { ws, userId: data.userId, username: data.username });
              console.log(`User ${data.username} registered for calls`);
            }
            break;
            
          case 'initiate-call':
            await handleInitiateCall(ws, data);
            break;
            
          case 'accept-call':
            await handleAcceptCall(ws, data);
            break;
            
          case 'decline-call':
            await handleDeclineCall(ws, data);
            break;
            
          case 'end-call':
            await handleEndCall(ws, data);
            break;
            
          case 'webrtc-offer':
          case 'webrtc-answer':
          case 'webrtc-ice-candidate':
            await relayWebRTCSignal(ws, data);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove user from connections when they disconnect
      for (const [userId, connection] of Array.from(connections.entries())) {
        if (connection.ws === ws) {
          connections.delete(userId);
          console.log(`User ${connection.username} disconnected from calls`);
          break;
        }
      }
    });
  });
  
  async function handleInitiateCall(ws: WebSocket, data: any) {
    try {
      console.log('🔵 Handling initiate call:', data);
      
      // Find the caller
      const caller = Array.from(connections.values()).find(conn => conn.ws === ws);
      console.log('🔵 Caller found:', caller ? caller.username : 'NOT FOUND');
      if (!caller) return;
      
      // Find target user by username
      console.log('🔵 Looking for target user:', data.targetUser);
      console.log('🔵 Available connections:', Array.from(connections.values()).map(c => c.username));
      const targetUser = Array.from(connections.values()).find(conn => conn.username === data.targetUser);
      console.log('🔵 Target user found:', targetUser ? targetUser.username : 'NOT FOUND');
      
      if (!targetUser) {
        console.log('🔵 Target user not online, sending call-failed');
        ws.send(JSON.stringify({
          type: 'call-failed',
          reason: 'User not online'
        }));
        return;
      }
      
      // Create call ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store active call
      activeCalls.set(callId, {
        caller: caller.userId,
        callee: targetUser.userId,
        callId
      });
      
      // Get caller's user info
      const callerUser = await storage.getUser(parseInt(caller.userId));
      
      // Send incoming call to target user
      targetUser.ws.send(JSON.stringify({
        type: 'incoming-call',
        callId,
        caller: caller.username,
        callerAvatar: callerUser?.avatar,
        callerId: caller.userId
      }));
      
      console.log(`Call initiated: ${caller.username} -> ${targetUser.username}`);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      ws.send(JSON.stringify({
        type: 'call-failed',
        reason: 'Server error'
      }));
    }
  }
  
  async function handleAcceptCall(ws: WebSocket, data: any) {
    try {
      // Find the call
      const call = Array.from(activeCalls.values()).find(call => {
        const calleeConnection = connections.get(call.callee);
        return calleeConnection?.ws === ws;
      });
      
      if (!call) return;
      
      // Notify caller that call was accepted
      const callerConnection = connections.get(call.caller);
      if (callerConnection) {
        callerConnection.ws.send(JSON.stringify({
          type: 'call-accepted',
          callId: call.callId
        }));
      }
      
      console.log(`Call accepted: ${call.callId}`);
      
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  }
  
  async function handleDeclineCall(ws: WebSocket, data: any) {
    try {
      // Find and remove the call
      for (const [callId, call] of Array.from(activeCalls.entries())) {
        const calleeConnection = connections.get(call.callee);
        if (calleeConnection?.ws === ws) {
          // Notify caller
          const callerConnection = connections.get(call.caller);
          if (callerConnection) {
            callerConnection.ws.send(JSON.stringify({
              type: 'call-declined',
              callId
            }));
          }
          
          activeCalls.delete(callId);
          console.log(`Call declined: ${callId}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error declining call:', error);
    }
  }
  
  async function handleEndCall(ws: WebSocket, data: any) {
    try {
      // Find and remove the call
      for (const [callId, call] of Array.from(activeCalls.entries())) {
        const callerConnection = connections.get(call.caller);
        const calleeConnection = connections.get(call.callee);
        
        if (callerConnection?.ws === ws || calleeConnection?.ws === ws) {
          // Notify both parties
          if (callerConnection && callerConnection.ws !== ws) {
            callerConnection.ws.send(JSON.stringify({
              type: 'call-ended',
              callId
            }));
          }
          if (calleeConnection && calleeConnection.ws !== ws) {
            calleeConnection.ws.send(JSON.stringify({
              type: 'call-ended',
              callId
            }));
          }
          
          activeCalls.delete(callId);
          console.log(`Call ended: ${callId}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }
  
  async function relayWebRTCSignal(ws: WebSocket, data: any) {
    try {
      // Find the active call for this WebSocket
      for (const call of Array.from(activeCalls.values())) {
        const callerConnection = connections.get(call.caller);
        const calleeConnection = connections.get(call.callee);
        
        if (callerConnection?.ws === ws) {
          // Relay to callee
          if (calleeConnection) {
            calleeConnection.ws.send(JSON.stringify(data));
          }
          break;
        } else if (calleeConnection?.ws === ws) {
          // Relay to caller
          if (callerConnection) {
            callerConnection.ws.send(JSON.stringify(data));
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error relaying WebRTC signal:', error);
    }
  }
  
  return httpServer;
}
