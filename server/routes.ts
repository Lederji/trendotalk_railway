import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertPostSchema, insertCommentSchema, insertStorySchema, insertVibeSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { uploadToCloudinary } from "./cloudinary";

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
    req.user = sessions.get(sessionId);
    return next();
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
      
      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount
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

  // Get user profile by username
  app.get('/api/users/profile/:username', authenticateUser, async (req: any, res: any) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error('Error getting user profile:', error);
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

  // User routes
  app.get('/api/users/:username', async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let isFollowing = false;
      if (req.headers.authorization) {
        const sessionId = req.headers.authorization.replace('Bearer ', '');
        const session = sessions.get(sessionId);
        if (session) {
          isFollowing = await storage.isFollowing(session.userId, user.id);
        }
      }
      
      const posts = await storage.getUserPosts(user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isAdmin: user.isAdmin,
        isFollowing,
        posts
      });
    } catch (error) {
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

  // Get user profile
  app.get('/api/users/:userId', authenticateUser, async (req: any, res: any) => {
    try {
      const userId = Number(req.params.userId);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove sensitive information
      const { password, ...userProfile } = user;
      res.json(userProfile);
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
  app.get('/api/chats', authenticateUser, async (req: any, res: any) => {
    try {
      const chats = await storage.getUserChats(req.user.userId);
      res.json(chats);
    } catch (error) {
      console.error('Error getting chats:', error);
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

  app.post('/api/chats/:chatId/messages', authenticateUser, async (req: any, res: any) => {
    try {
      const chatId = Number(req.params.chatId);
      const { message } = req.body;
      
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: 'Message cannot be empty' });
      }
      
      // Verify user has access to this chat
      const userChats = await storage.getUserChats(req.user.userId);
      const hasAccess = userChats.some(chat => chat.id === chatId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this chat' });
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
      const userChats = await storage.getUserChats(req.user.userId);
      
      const chat = userChats.find(c => c.id === chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
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
      const userChats = await storage.getUserChats(req.user.userId);
      
      const chat = userChats.find(c => c.id === chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
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

  const httpServer = createServer(app);
  return httpServer;
}
