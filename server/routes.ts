import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertPostSchema, insertCommentSchema, insertStorySchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
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

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function authenticateUser(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  req.user = sessions.get(sessionId);
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));
  
  // Auth routes
  app.post('/api/signup', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check username availability
      const isAvailable = await storage.checkUsernameAvailability(userData.username);
      if (!isAvailable) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      const user = await storage.createUser(userData);
      const sessionId = generateSessionId();
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
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Use bcrypt to compare password with hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const sessionId = generateSessionId();
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

  // Username availability check
  app.get('/api/check/:username', async (req, res) => {
    try {
      const { username } = req.params;
      const isAvailable = await storage.checkUsernameAvailability(username);
      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Post routes
  app.post('/api/posts', authenticateUser, upload.single('media'), async (req: any, res: any) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      let mediaUrl = null;
      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
      }
      
      const post = await storage.createPost({
        ...postData,
        userId: user.id,
        imageUrl: req.file?.mimetype.startsWith('image') ? mediaUrl : null,
        videoUrl: req.file?.mimetype.startsWith('video') ? mediaUrl : null,
        isAdminPost: user.isAdmin && req.body.isAdminPost === 'true',
      });
      
      const postWithUser = await storage.getPostById(post.id);
      res.json(postWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
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
        category as string, 
        adminOnly === 'true' ? true : undefined
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

  // Like routes
  app.post('/api/posts/:id/like', authenticateUser, async (req: any, res: any) => {
    try {
      const result = await storage.toggleLike(Number(req.params.id), req.user.userId);
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
      
      let mediaUrl = null;
      if (req.file) {
        mediaUrl = `/uploads/${req.file.filename}`;
      }
      
      const story = await storage.createStory({
        ...storyData,
        userId: req.user.userId,
        imageUrl: req.file?.mimetype.startsWith('image') ? mediaUrl : null,
        videoUrl: req.file?.mimetype.startsWith('video') ? mediaUrl : null,
      });
      
      res.json(story);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
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

  const httpServer = createServer(app);
  return httpServer;
}
