import { Express } from "express";
import { storage } from "./storage";

function authenticateAdmin(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Get session from routes.ts sessions map
  const sessions = (global as any).adminSessions || new Map();
  const session = sessions.get(sessionId);
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Check if user is admin
  storage.getUser(session.userId).then(user => {
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.user = session;
    next();
  }).catch(() => {
    res.status(500).json({ message: 'Internal server error' });
  });
}

export function registerAdminRoutes(app: Express, sessions: Map<string, any>) {
  // Store sessions globally for admin auth
  (global as any).adminSessions = sessions;

  // Admin Statistics
  app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const posts = await storage.getAllPosts();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter out admin users from public stats
      const nonAdminUsers = users.filter(user => !user.isAdmin);
      
      const todaySignups = nonAdminUsers.filter(user => 
        new Date(user.createdAt) >= today
      ).length;

      const activeUsers = nonAdminUsers.filter(user => {
        const lastActive = user.lastActive || user.createdAt;
        const timeDiff = Date.now() - new Date(lastActive).getTime();
        return timeDiff < 30 * 60 * 1000; // 30 minutes
      }).length;

      const stats = {
        totalUsers: nonAdminUsers.length,
        totalPosts: posts.length,
        totalComments: 0, // Will implement later
        activeUsers,
        reportsCount: 0, // Will implement later
        todaySignups
      };

      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get All Users for Admin
  app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithStats = await Promise.all(users.map(async (user) => {
        const userPosts = await storage.getUserPosts(user.id);
        return {
          ...user,
          postsCount: userPosts.length,
          lastActive: user.lastActive || user.createdAt,
          isBanned: user.isBanned || false,
          isVerified: user.isVerified || false
        };
      }));
      
      res.json(usersWithStats);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get All Posts for Admin
  app.get('/api/admin/posts', authenticateAdmin, async (req, res) => {
    try {
      const posts = await storage.getAllPostsForAdmin();
      res.json(posts);
    } catch (error) {
      console.error('Admin posts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Ban User
  app.post('/api/admin/users/:id/ban', authenticateAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const userId = Number(req.params.id);
      
      const success = await storage.banUser(userId, reason);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User banned successfully' });
    } catch (error) {
      console.error('Ban user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Unban User
  app.post('/api/admin/users/:id/unban', authenticateAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      const success = await storage.unbanUser(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User unbanned successfully' });
    } catch (error) {
      console.error('Unban user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify User (Blue Tick)
  app.post('/api/admin/users/:id/verify', authenticateAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      const success = await storage.verifyUser(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User verified successfully' });
    } catch (error) {
      console.error('Verify user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete User
  app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Admin Delete Any Post
  app.delete('/api/admin/posts/:id', authenticateAdmin, async (req, res) => {
    try {
      const postId = Number(req.params.id);
      
      const success = await storage.adminDeletePost(postId);
      if (!success) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Admin delete post error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send Admin Message to User
  app.post('/api/admin/users/:id/message', authenticateAdmin, async (req, res) => {
    try {
      const { message } = req.body;
      const userId = Number(req.params.id);
      
      const success = await storage.sendAdminMessage(userId, message, req.user.userId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'Message sent successfully' });
    } catch (error) {
      console.error('Send admin message error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Send Notification to All Users
  app.post('/api/admin/notifications', authenticateAdmin, async (req, res) => {
    try {
      const { message, userIds } = req.body;
      
      const success = await storage.sendBroadcastNotification(message, userIds);
      res.json({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Export Users Data
  app.get('/api/admin/export/users', authenticateAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const exportData = users.map(user => ({
        id: user.id,
        username: user.username,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        createdAt: user.createdAt,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified || false,
        isBanned: user.isBanned || false
      }));
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=users-export.json');
      res.json(exportData);
    } catch (error) {
      console.error('Export users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Export Posts Data
  app.get('/api/admin/export/posts', authenticateAdmin, async (req, res) => {
    try {
      const posts = await storage.getAllPostsForAdmin();
      const exportData = posts.map(post => ({
        id: post.id,
        content: post.content || post.title || post.caption,
        author: post.user.username,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        createdAt: post.createdAt,
        isAdminPost: post.isAdminPost
      }));
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=posts-export.json');
      res.json(exportData);
    } catch (error) {
      console.error('Export posts error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get User Activity Logs
  app.get('/api/admin/users/:id/activity', authenticateAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const activities = await storage.getUserActivityLogs(userId);
      res.json(activities);
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Update App Settings
  app.put('/api/admin/settings', authenticateAdmin, async (req, res) => {
    try {
      const settings = req.body;
      const success = await storage.updateAppSettings(settings);
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get Reported Content
  app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
    try {
      const reports = await storage.getReportedContent();
      res.json(reports);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
}