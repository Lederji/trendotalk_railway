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

  // Post routes
  app.post('/api/posts', authenticateUser, upload.single('media'), async (req: any, res: any) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const user = await storage.getUser(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
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
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({ message: 'File upload failed' });
        }
      }
      
      const post = await storage.createPost({
        ...postData,
        userId: user.id,
        imageUrl,
        videoUrl,
        isAdminPost: user.isAdmin && req.body.isAdminPost === 'true',
      });
      
      const postWithUser = await storage.getPostById(post.id);
      res.json(postWithUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        console.error('Post creation error:', error);
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
      
      const story = await storage.createStory({
        ...storyData,
        userId: req.user.userId,
        imageUrl,
        videoUrl,
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
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
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
      if (!success) {
        return res.status(400).json({ message: 'Cannot send friend request' });
      }
      res.json({ message: 'Friend request sent' });
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
      
      const newMessage = await storage.sendMessage(chatId, req.user.userId, message.trim());
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

  const httpServer = createServer(app);
  return httpServer;
}
