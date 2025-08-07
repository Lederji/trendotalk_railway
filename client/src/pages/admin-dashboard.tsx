import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  FileText, 
  BarChart3, 
  Shield, 
  Bell, 
  Settings, 
  Trash2, 
  Edit, 
  Ban, 
  CheckCircle,
  Search,
  MessageSquare,
  Flag,
  Download,
  Upload,
  Eye,
  UserCheck,
  Calendar,
  Activity,
  ArrowLeft
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  reportsCount: number;
  todaySignups: number;
}

interface AdminNotification {
  id: number;
  type: string;
  message: string;
  fromUsername?: string;
  postId?: number;
  postImage?: string;
  postVideo?: string;
  createdAt: string;
  isRead: boolean;
}

interface AdminUser {
  id: number;
  username: string;
  avatar?: string;
  isAdmin: boolean;
  accountStatus: string;
  emailVerified: boolean;
  followersCount: number;
  postsCount: number;
  createdAt: string;
  lastActive?: string;
}

interface AdminPost {
  id: number;
  content: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  isReported?: boolean;
  user: {
    username: string;
    avatar?: string;
  };
  createdAt: string;
}

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [banReason, setBanReason] = useState("");
  const [reportsViewed, setReportsViewed] = useState(false);
  const [lastReportsCount, setLastReportsCount] = useState(0);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (!isAuthenticated || !user?.isAdmin) {
    setLocation('/auth');
    return null;
  }

  // Fetch admin statistics
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });

  // Fetch all users for management
  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch all posts for moderation
  const { data: posts = [] } = useQuery<AdminPost[]>({
    queryKey: ["/api/admin/posts"],
    queryFn: async () => {
      const response = await fetch("/api/admin/posts", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  // Fetch help requests
  const { data: helpRequests = [] } = useQuery({
    queryKey: ["/api/admin/help-requests"],
    queryFn: async () => {
      const response = await fetch("/api/admin/help-requests", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch help requests');
      return response.json();
    },
  });

  // Fetch user reports
  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: async () => {
      const response = await fetch("/api/admin/reports", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    },
  });

  // Fetch notifications including reports
  const { data: notifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
  });

  // Ban user mutation
  const banUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBanModalOpen(false);
      setBanReason("");
      toast({
        title: "Success",
        description: "User banned successfully and notification sent",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to ban user",
        variant: "destructive",
      });
    }
  });

  // Verify user mutation
  const verifyUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/verify`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    }
  });

  // Mark help request as read mutation
  const markHelpRequestAsReadMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest("POST", `/api/admin/help-requests/${requestId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help-requests"] });
      toast({
        title: "Success",
        description: "Help request marked as read and deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to mark help request as read",
        variant: "destructive",
      });
    }
  });

  // Unban user mutation
  const unbanUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User unbanned successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to unban user",
        variant: "destructive",
      });
    }
  });

  // Dismiss notification mutation
  const dismissNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/notifications/${notificationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Report dismissed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to dismiss report",
        variant: "destructive",
      });
    }
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await apiRequest("DELETE", `/api/admin/posts/${postId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  });

  // Send admin message mutation
  const sendAdminMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: number; message: string }) => {
      const response = await fetch(`/api/admin/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: JSON.stringify({ userId, message })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setMessageModalOpen(false);
      setAdminMessage("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // Track when new reports come in
  useEffect(() => {
    if (reports.length > lastReportsCount) {
      setReportsViewed(false);
    }
    setLastReportsCount(reports.length);
  }, [reports.length, lastReportsCount]);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.username}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.todaySignups || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.reportsCount || 0}</div>
              <p className="text-xs text-muted-foreground">Pending review</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="notifications" className="space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-fit">
              <TabsTrigger value="users" className="whitespace-nowrap px-3 py-1.5 text-sm">Users</TabsTrigger>
              <TabsTrigger value="posts" className="whitespace-nowrap px-3 py-1.5 text-sm">Posts</TabsTrigger>
              <TabsTrigger value="analytics" className="whitespace-nowrap px-3 py-1.5 text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="moderation" className="whitespace-nowrap px-3 py-1.5 text-sm">Moderation</TabsTrigger>
              <TabsTrigger value="help-requests" className="whitespace-nowrap px-3 py-1.5 text-sm">Help Requests</TabsTrigger>
              <TabsTrigger value="notifications" className="relative whitespace-nowrap px-3 py-1.5 text-sm">
                Post Reports
                {notifications.filter((n: AdminNotification) => n.type === 'post_report').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.filter((n: AdminNotification) => n.type === 'post_report').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="relative whitespace-nowrap px-3 py-1.5 text-sm"
                onClick={() => setReportsViewed(true)}
              >
                User Reports
                {reports.length > 0 && !reportsViewed && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {reports.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="settings" className="whitespace-nowrap px-3 py-1.5 text-sm">Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button>Export Users</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            {user.emailVerified && <Badge variant="secondary">Verified</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.accountStatus === 'banned' ? (
                            <Badge variant="destructive">Banned</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{user.followersCount}</TableCell>
                        <TableCell>{user.postsCount}</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyUserMutation.mutate(user.id)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setMessageModalOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            {user.accountStatus === 'banned' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => unbanUserMutation.mutate(user.id)}
                                disabled={unbanUserMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setBanModalOpen(true);
                                }}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Post Management Tab */}
          <TabsContent value="posts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Moderation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Content</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="truncate">{post.content}</p>
                            {post.mediaUrl && (
                              <Badge variant="secondary">Has Media</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{post.user.username}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{post.likesCount} likes</p>
                            <p>{post.commentsCount} comments</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {post.isReported ? (
                            <Badge variant="destructive">Reported</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deletePostMutation.mutate(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Signups</span>
                      <span className="font-bold">{stats?.totalUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Today</span>
                      <span className="font-bold">{stats?.todaySignups}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Now</span>
                      <span className="font-bold">{stats?.activeUsers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Posts</span>
                      <span className="font-bold">{stats?.totalPosts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Comments</span>
                      <span className="font-bold">{stats?.totalComments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reports</span>
                      <span className="font-bold">{stats?.reportsCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Moderation Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Auto-Moderation Settings</h3>
                    <div className="flex items-center justify-between">
                      <Label>Auto-ban on 5 reports</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Filter profanity</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Require approval for new posts</Label>
                      <Switch />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Blocked Keywords</h3>
                    <Textarea placeholder="Enter keywords to block, one per line" />
                    <Button>Update Keywords</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Reports Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Post Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Post</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.filter((n: AdminNotification) => n.type === 'post_report').map((notification: AdminNotification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                              <Flag className="h-4 w-4 text-red-600" />
                            </div>
                            <span>{notification.fromUsername || 'Anonymous'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm text-gray-600">Post ID: {notification.postId}</p>
                            {notification.postVideo && (
                              <video 
                                src={notification.postVideo} 
                                className="w-16 h-16 object-cover rounded mt-1"
                                muted
                                playsInline
                              />
                            )}
                            {notification.postImage && !notification.postVideo && (
                              <img 
                                src={notification.postImage} 
                                alt="Reported post" 
                                className="w-16 h-16 object-cover rounded mt-1"
                              />
                            )}
                            <p className="text-xs text-gray-500 truncate mt-1">{notification.message}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">Inappropriate content</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                if (notification.postId) {
                                  setLocation(`/trends?postId=${notification.postId}`);
                                }
                              }}
                              title="View specific post"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => dismissNotificationMutation.mutate(notification.id)}
                              disabled={dismissNotificationMutation.isPending}
                              title="Dismiss this report"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={async () => {
                                if (notification.postId && confirm('Are you sure you want to delete this reported post? This action cannot be undone.')) {
                                  try {
                                    const response = await fetch(`/api/admin/posts/${notification.postId}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
                                      }
                                    });
                                    
                                    if (response.ok) {
                                      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
                                      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
                                      toast({
                                        title: "Success",
                                        description: "Post deleted successfully",
                                      });
                                    } else {
                                      const error = await response.json();
                                      toast({
                                        title: "Error", 
                                        description: error.message || "Failed to delete post",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error", 
                                      description: "Network error occurred",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              title="Delete reported post"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {notifications.filter((n: AdminNotification) => n.type === 'post_report').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No reports to review
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Send Notifications Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Send Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Message</Label>
                  <Textarea placeholder="Enter your notification message..." />
                </div>
                <div className="flex gap-4">
                  <Button>Send to All Users</Button>
                  <Button variant="outline">Send to Selected Users</Button>
                  <Button variant="outline">Schedule for Later</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  User Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reported User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reports Count</TableHead>
                      <TableHead>Latest Report</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {report.reportedUsername.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{report.reportedUsername}</p>
                            <p className="text-sm text-gray-500">ID: {report.reportedUserId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {report.reason.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {report.reportCount} reports
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {new Date(report.latestReport).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Ban className="w-4 h-4 mr-1" />
                              Suspend
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No user reports found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Requests Tab */}
          <TabsContent value="help-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Help & Support Requests
                </CardTitle>
                <p className="text-sm text-gray-600">
                  User support messages - automatically deleted after reading
                </p>
              </CardHeader>
              <CardContent>
                {helpRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No help requests at this time</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {helpRequests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {request.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {request.user?.displayName || request.user?.username || 'Unknown User'}
                                </p>
                                <p className="text-sm text-gray-500">ID: {request.userId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-900 line-clamp-3">
                                {request.message}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{request.subject}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => markHelpRequestAsReadMutation.mutate(request.id)}
                              disabled={markHelpRequestAsReadMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {markHelpRequestAsReadMutation.isPending ? "Processing..." : "Mark as Read & Delete"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  App Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">General Settings</h3>
                    <div className="flex items-center justify-between">
                      <Label>Maintenance Mode</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Allow New Registrations</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Enable Stories</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Data Management</h3>
                    <div className="space-y-2">
                      <Button className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export All Users
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export All Posts
                      </Button>
                      <Button className="w-full" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Backup Database
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Message Modal */}
        <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Message to {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea 
                  placeholder="Enter your message..." 
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setMessageModalOpen(false);
                  setAdminMessage("");
                }}>Cancel</Button>
                <Button 
                  onClick={() => {
                    if (selectedUser && adminMessage.trim()) {
                      sendAdminMessageMutation.mutate({
                        userId: selectedUser.id,
                        message: adminMessage
                      });
                    }
                  }}
                  disabled={sendAdminMessageMutation.isPending || !adminMessage.trim()}
                >
                  {sendAdminMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ban Modal */}
        <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User: {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Reason for Ban</Label>
                <Textarea 
                  placeholder="Enter reason for banning this user..." 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setBanModalOpen(false);
                  setBanReason("");
                }}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (selectedUser && banReason.trim()) {
                      banUserMutation.mutate({ userId: selectedUser.id, reason: banReason });
                    }
                  }}
                  disabled={!banReason.trim() || banUserMutation.isPending}
                >
                  {banUserMutation.isPending ? "Banning..." : "Ban User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}