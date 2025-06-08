import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Video, Info, Check, X, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Messages() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch admin messages
  const { data: adminMessages = [] } = useQuery({
    queryKey: ["/api/admin-messages"],
    queryFn: async () => {
      const response = await fetch("/api/admin-messages", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch admin messages');
      return response.json();
    },
  });

  // Fetch DM chats
  const { data: dmChats = [] } = useQuery({
    queryKey: ["/api/dm/chats"],
    queryFn: async () => {
      const response = await fetch("/api/dm/chats", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch DM chats');
      return response.json();
    },
  });

  // Fetch new DM chats for Requests tab
  const { data: newDmChats = [] } = useQuery({
    queryKey: ["/api/dm/new-chats"],
    queryFn: async () => {
      const response = await fetch("/api/dm/new-chats", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch new DM chats');
      return response.json();
    },
  });

  // Fetch DM requests
  const { data: dmRequests = [] } = useQuery({
    queryKey: ["/api/dm/requests"],
    queryFn: async () => {
      const response = await fetch("/api/dm/requests", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch DM requests');
      return response.json();
    },
  });

  // Fetch message requests (existing system)
  const { data: messageRequests = [] } = useQuery({
    queryKey: ["/api/message-requests"],
    queryFn: async () => {
      const response = await fetch("/api/message-requests", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch message requests');
      return response.json();
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      
      if (variables.action === 'accept') {
        try {
          const data = await response.json();
          if (data.chatId) {
            setLocation(`/chat/${data.chatId}`);
          }
        } catch (e) {
          // If no JSON response, that's fine
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  // Handle DM request response
  const handleDMRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'allow' | 'dismiss' | 'block' }) => {
      const response = await fetch(`/api/dm/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to process request');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/chats"] });
      
      if (variables.action === 'allow') {
        toast({
          title: "Request Accepted",
          description: "Chat has been created and moved to Messages",
        });
      } else if (variables.action === 'dismiss') {
        toast({
          title: "Request Dismissed", 
          description: "User cannot send requests for 72 hours",
        });
      } else if (variables.action === 'block') {
        toast({
          title: "User Blocked",
          description: "User has been permanently blocked",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to handle DM request",
        variant: "destructive",
      });
    },
  });

  // Combine admin messages and DM chats for display
  const messages = [
    ...adminMessages.map((chat: any) => ({
      id: chat.id,
      type: 'admin',
      username: chat.user.username,
      displayName: chat.user.displayName,
      avatar: chat.user.avatar,
      lastMessage: chat.messages?.length > 0 ? chat.messages[chat.messages.length - 1].content : "No messages yet",
      timestamp: chat.lastMessageTime ? format(new Date(chat.lastMessageTime), 'MMM d, h:mm a') : "Just now",
      unreadCount: 0,
      isOnline: true
    })),
    ...dmChats.map((chat: any) => ({
      id: chat.id,
      type: 'dm',
      username: chat.user.username,
      displayName: chat.user.displayName || chat.user.username,
      avatar: chat.user.avatar,
      lastMessage: chat.lastMessage || "Start a conversation",
      timestamp: chat.lastMessageTime ? format(new Date(chat.lastMessageTime), 'MMM d, h:mm a') : 
                chat.updatedAt ? format(new Date(chat.updatedAt), 'MMM d, h:mm a') : "Just now",
      unreadCount: 0,
      isOnline: true
    }))
  ];

  const handleUserClick = (message: any) => {
    console.log('Messages page - handleUserClick called with:', message);
    if (message.type === 'dm') {
      // Navigate to DM chat
      console.log('Messages page - navigating to DM chat:', `/dm/${message.id}`);
      setLocation(`/dm/${message.id}`);
    } else {
      // Navigate to admin chat using existing chat route
      console.log('Messages page - navigating to admin chat:', `/chat/${message.id}`);
      setLocation(`/chat/${message.id}`);
    }
  };

  const handleStartNewDM = (userId: number) => {
    // Navigate to home page to start new DM conversation
    setLocation(`/?tab=messages&newchat=${userId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Direct Messages
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">


        {/* Tabs */}
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-1">
            <TabsTrigger 
              value="messages" 
              className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Messages
              {messages.some(msg => msg.unreadCount > 0) && (
                <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 text-xs">
                  {messages.reduce((acc, msg) => acc + msg.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Requests
              {(messageRequests.length + dmRequests.length) > 0 && (
                <Badge className="ml-2 bg-red-500 text-white h-5 w-5 p-0 text-xs">
                  {messageRequests.length + dmRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <ArrowLeft className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No messages yet</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleUserClick(message)}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={message.avatar} alt={message.displayName} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {message.displayName ? message.displayName.split(' ').map(n => n[0]).join('') : message.username?.substring(0, 2).toUpperCase() || '??'}
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
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {message.lastMessage}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {message.unreadCount > 0 && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white h-6 w-6 p-0 text-xs rounded-full">
                          {message.unreadCount}
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                          <Phone className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                          <Video className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {messageRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No message requests</p>
              </div>
            ) : (
              messageRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={request.avatar} alt={request.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {request.displayName ? request.displayName.split(' ').map(n => n[0]).join('') : request.username?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {request.displayName || request.username}
                      </h3>
                      <p className="text-sm text-gray-600">
                        @{request.username} • {request.mutualFriends} mutual friends
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{request.timestamp}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600 px-4"
                      >
                        Accept
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-gray-600 hover:bg-gray-50 px-4"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {messageRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No message requests</p>
              </div>
            ) : (
              messageRequests.map((request: any) => (
                <div
                  key={request.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={request.fromUser?.avatar} alt={request.fromUser?.displayName || request.fromUser?.username} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {request.fromUser?.displayName ? request.fromUser.displayName.split(' ').map((n: string) => n[0]).join('') : request.fromUser?.username?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {request.fromUser?.displayName || request.fromUser?.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {format(new Date(request.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {request.message}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'accept' })}
                          disabled={handleMessageRequest.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'reject' })}
                          disabled={handleMessageRequest.isPending}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}