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

  // Fetch circle conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch("/api/conversations", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
  });

  // Fetch message requests (Circle)
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

  // Handle DM request actions
  const handleDMRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'allow' | 'dismiss' | 'block' }) => {
      return apiRequest(`/api/dm/requests/${requestId}/${action}`, {
        method: 'POST',
      });
    },
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dm/chats"] });
      
      if (action === 'allow') {
        toast({
          title: "DM Request Allowed",
          description: "You can now message each other directly.",
        });
      } else if (action === 'dismiss') {
        toast({
          title: "DM Request Dismissed",
          description: "The request has been removed.",
        });
      } else if (action === 'block') {
        toast({
          title: "User Blocked",
          description: "This user has been blocked from messaging you.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle message request actions (Circle)
  const handleMessageRequest = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'decline' }) => {
      return apiRequest(`/api/message-requests/${requestId}/${action}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const totalRequests = dmRequests.length + messageRequests.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Messages
          </h1>
        </div>

        <Tabs defaultValue="dm" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dm" className="relative">
              DM
              {dmChats.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {dmChats.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="circle" className="relative">
              Circle
              {conversations.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  {conversations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {totalRequests > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  {totalRequests}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* DM Tab */}
          <TabsContent value="dm" className="space-y-3">
            {/* Admin Messages */}
            {adminMessages.map((message: any) => (
              <div
                key={message.id}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage src="/admin-avatar.png" alt="Admin" />
                    <AvatarFallback className="bg-white text-purple-600 font-bold">A</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white">TrendoTalk Admin</h3>
                      <Badge variant="secondary" className="bg-white/20 text-white">Official</Badge>
                    </div>
                    <p className="text-blue-100 text-sm line-clamp-2">{message.content}</p>
                    <p className="text-xs text-blue-200 mt-1">{format(new Date(message.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* DM Chats */}
            {dmChats.length === 0 && adminMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No direct messages yet</p>
                <p className="text-sm text-gray-400 mt-2">Start a conversation by visiting someone's profile</p>
              </div>
            ) : (
              dmChats.map((chat: any) => (
                <div
                  key={chat.id}
                  onClick={() => setLocation(`/dm/${chat.id}`)}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={chat.otherUser.avatar} alt={chat.otherUser.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {chat.otherUser.displayName ? chat.otherUser.displayName.split(' ').map((n: string) => n[0]).join('') : chat.otherUser.username?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {chat.otherUser.displayName || chat.otherUser.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {chat.lastMessage ? format(new Date(chat.lastMessage.createdAt), 'MMM d') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">@{chat.otherUser.username}</p>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                          {chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Circle Tab */}
          <TabsContent value="circle" className="space-y-3">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No Circle conversations</p>
                <p className="text-sm text-gray-400 mt-2">Add friends to start chatting privately</p>
              </div>
            ) : (
              conversations.map((conversation: any) => (
                <div
                  key={conversation.id}
                  onClick={() => setLocation(`/circle?chat=${conversation.id}`)}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={conversation.otherUser.avatar} alt={conversation.otherUser.displayName} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {conversation.otherUser.displayName ? conversation.otherUser.displayName.split(' ').map((n: string) => n[0]).join('') : conversation.otherUser.username?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {conversation.otherUser.displayName || conversation.otherUser.username}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessage ? format(new Date(conversation.lastMessage.createdAt), 'MMM d') : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">@{conversation.otherUser.username}</p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-700 mt-1 line-clamp-1">
                          {conversation.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {/* DM Requests */}
            {dmRequests.map((request: any) => (
              <div
                key={`dm-${request.id}`}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage src={request.fromUser.avatar} alt={request.fromUser.displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {request.fromUser.displayName ? request.fromUser.displayName.split(' ').map((n: string) => n[0]).join('') : request.fromUser.username?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {request.fromUser.displayName || request.fromUser.username}
                    </h3>
                    <p className="text-sm text-gray-600">@{request.fromUser.username} • DM Request</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(request.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{request.firstMessage}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="bg-green-500 text-white hover:bg-green-600 px-4 flex-1"
                    onClick={() => handleDMRequest.mutate({ requestId: request.id, action: 'allow' })}
                    disabled={handleDMRequest.isPending}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Allow
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-gray-600 hover:bg-gray-50 px-4 flex-1"
                    onClick={() => handleDMRequest.mutate({ requestId: request.id, action: 'dismiss' })}
                    disabled={handleDMRequest.isPending}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 px-4"
                    onClick={() => handleDMRequest.mutate({ requestId: request.id, action: 'block' })}
                    disabled={handleDMRequest.isPending}
                  >
                    Block
                  </Button>
                </div>
              </div>
            ))}

            {/* Circle Message Requests */}
            {messageRequests.map((request: any) => (
              <div
                key={`circle-${request.id}`}
                className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage src={request.avatar} alt={request.displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {request.displayName ? request.displayName.split(' ').map((n: string) => n[0]).join('') : request.username?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {request.displayName || request.username}
                    </h3>
                    <p className="text-sm text-gray-600">
                      @{request.username} • Circle Request
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{request.timestamp}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-green-500 text-white hover:bg-green-600"
                      onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'accept' })}
                      disabled={handleMessageRequest.isPending}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleMessageRequest.mutate({ requestId: request.id, action: 'decline' })}
                      disabled={handleMessageRequest.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {dmRequests.length === 0 && messageRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No requests</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}