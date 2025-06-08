import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { UnifiedPostCard } from "@/components/post/unified-post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Hash, MessageCircle, Home as HomeIcon, Users } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useVideoAutoplay } from "@/hooks/use-video-autoplay";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "wouter";
import Auth from "@/pages/auth";

const CATEGORIES = [
  { id: "all", label: "Top Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "x", label: "X" },
  { id: "films", label: "Films" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("home");
  const { registerVideo, unregisterVideo, observePost, unobservePost } = useVideoAutoplay();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check URL parameters for messaging
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const tab = urlParams.get('tab');
    const chatId = urlParams.get('chat');
    const newChatUserId = urlParams.get('newchat');
    
    if (tab === 'messages') {
      setActiveTab('messages');
    }
  }, [location]);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", "admin-only"],
    queryFn: async () => {
      const response = await fetch("/api/posts?adminOnly=true", {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  // Fetch admin messages for DM functionality
  const { data: adminMessages = [] } = useQuery({
    queryKey: ["/api/admin-messages"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const response = await fetch("/api/admin-messages", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch admin messages');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'messages',
  });

  // Fetch message requests
  const { data: messageRequests = [] } = useQuery({
    queryKey: ["/api/message-requests"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const response = await fetch("/api/message-requests", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch message requests');
      return response.json();
    },
    enabled: isAuthenticated && activeTab === 'messages',
  });

  // Filter admin posts based on active category
  const filteredPosts = allPosts.filter((post: any) => {
    if (activeCategory === "all") {
      return post.isAdminPost;
    } else {
      if (post.otherRank) {
        const otherRankLower = post.otherRank.toLowerCase();
        if (activeCategory === "youtube") {
          return otherRankLower.includes("youtube") || otherRankLower.includes("yt");
        } else if (activeCategory === "instagram") {
          return otherRankLower.includes("instagram") || otherRankLower.includes("insta");
        } else if (activeCategory === "films") {
          return otherRankLower.includes("films") || otherRankLower.includes("film");
        } else {
          return otherRankLower.includes(activeCategory);
        }
      }
      return false;
    }
  }).sort((a: any, b: any) => {
    if (activeCategory === "all") {
      if (a.rank && !b.rank) return -1;
      if (!a.rank && b.rank) return 1;
      if (a.rank && b.rank) return (a.rank || 999) - (b.rank || 999);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    } else {
      const getRankFromOtherRank = (otherRank: string) => {
        const match = otherRank.match(/#(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      return getRankFromOtherRank(a.otherRank || "") - getRankFromOtherRank(b.otherRank || "");
    }
  });

  // Format admin messages for display
  const dmMessages = adminMessages.map((chat: any) => ({
    id: chat.id,
    username: chat.user.username,
    displayName: chat.user.displayName,
    avatar: chat.user.avatar,
    lastMessage: chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1].content : "No messages yet",
    timestamp: chat.lastMessageTime ? format(new Date(chat.lastMessageTime), 'MMM d, h:mm a') : "Just now",
    unreadCount: 0,
    isOnline: true
  }));

  // Handle message request response
  const handleMessageRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'reject' }) => {
      return apiRequest('PATCH', `/api/message-requests/${requestId}`, { action });
    },
    onSuccess: async (response, variables) => {
      toast({
        title: variables.action === 'accept' ? "Message request accepted" : "Message request rejected",
        description: variables.action === 'accept' ? "You can now chat with this user." : "Message request has been dismissed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/message-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 pb-20">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 my-4 bg-white">
            <TabsTrigger value="home" className="flex items-center space-x-2">
              <HomeIcon className="w-4 h-4" />
              <span>Home</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Messages</span>
              {(dmMessages.length > 0 || messageRequests.length > 0) && (
                <Badge className="bg-red-500 text-white ml-1">
                  {dmMessages.length + messageRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Home Tab - Video Posts Feed */}
          <TabsContent value="home" className="space-y-4">
            {/* Tags Bar */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? "default" : "outline"}
                      size="sm"
                      className={`whitespace-nowrap text-xs px-3 py-1 ${
                        activeCategory === category.id
                          ? "gradient-bg text-white hover:opacity-90"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Video Posts Feed */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-0">
                      <div className="w-full aspect-video bg-gray-200 rounded-t"></div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-4 bg-gray-200 rounded"></div>
                          <div className="w-12 h-4 bg-gray-200 rounded"></div>
                          <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="w-full h-4 bg-gray-200 rounded"></div>
                          <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex items-center space-x-4 pt-2">
                          <div className="w-12 h-6 bg-gray-200 rounded"></div>
                          <div className="w-12 h-6 bg-gray-200 rounded"></div>
                          <div className="w-12 h-6 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No trending videos yet</h3>
                  <p className="text-gray-500">Admin hasn't posted any videos in this category!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredPosts.map((post: any, index: number) => (
                  <UnifiedPostCard
                    key={post.id}
                    post={post}
                    currentUser={user}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab - DM System */}
          <TabsContent value="messages" className="space-y-4">
            <Tabs defaultValue="chats" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white">
                <TabsTrigger value="chats">
                  Direct Messages
                  {dmMessages.length > 0 && (
                    <Badge className="ml-2 bg-blue-500 text-white">
                      {dmMessages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {messageRequests.length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white">
                      {messageRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Direct Messages */}
              <TabsContent value="chats" className="space-y-3">
                {dmMessages.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No direct messages</h3>
                      <p className="text-gray-500">Start a conversation by sending a message request!</p>
                    </CardContent>
                  </Card>
                ) : (
                  dmMessages.map((message: any) => (
                    <Card key={message.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4" onClick={() => window.location.href = `/chat/${message.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={message.avatar} alt={message.displayName} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                {message.displayName ? message.displayName.split(' ').map((n: string) => n[0]).join('') : message.username?.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            {message.isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 truncate">
                                {message.displayName || message.username}
                              </h3>
                              <span className="text-xs text-gray-500 ml-2">
                                {message.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {message.lastMessage}
                            </p>
                          </div>
                          
                          {message.unreadCount > 0 && (
                            <Badge className="bg-blue-500 text-white">
                              {message.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Message Requests */}
              <TabsContent value="requests" className="space-y-3">
                {messageRequests.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No message requests</h3>
                      <p className="text-gray-500">People who want to message you will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  messageRequests.map((request: any) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.fromUser?.avatar} alt={request.fromUser?.displayName || request.fromUser?.username} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                              {request.fromUser?.displayName ? request.fromUser.displayName.split(' ').map((n: string) => n[0]).join('') : request.fromUser?.username?.substring(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900">
                              {request.fromUser?.displayName || request.fromUser?.username}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {request.message || "Wants to send you a message"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(request.createdAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'accept' })}
                            disabled={handleMessageRequest.isPending}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'reject' })}
                            disabled={handleMessageRequest.isPending}
                            className="flex-1"
                          >
                            Decline
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
      
      <Navigation />
    </div>
  );
}