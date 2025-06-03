import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MessageCircle, UserPlus, Check, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Auth from "./auth";

export default function Circle() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: !!searchQuery.trim(),
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    queryFn: async () => {
      const response = await fetch("/api/friend-requests", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch friend requests');
      return response.json();
    },
  });

  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: async () => {
      const response = await fetch("/api/chats", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      return response.json();
    },
  });

  const { data: friendStatus = [] } = useQuery({
    queryKey: ["/api/friends/status"],
    queryFn: async () => {
      const response = await fetch("/api/friends/status", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch friend status');
      return response.json();
    },
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/friend-requests/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error('Failed to send friend request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      toast({ title: "Friend request sent!" });
    },
  });

  const handleFriendRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: 'accept' | 'reject' }) => {
      const response = await fetch(`/api/friend-requests/${requestId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error('Failed to handle friend request');
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({ 
        title: variables.action === 'accept' ? "Friend request accepted!" : "Friend request rejected" 
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: number; message: string }) => {
      const response = await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setMessageText("");
    },
  });

  const handleSendFriendRequest = (userId: number) => {
    sendFriendRequestMutation.mutate(userId);
  };

  const handleFriendRequest = (requestId: number, action: 'accept' | 'reject') => {
    handleFriendRequestMutation.mutate({ requestId, action });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    sendMessageMutation.mutate({ chatId: selectedChat.id, message: messageText });
  };

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold gradient-text mb-2">Your Circle</h1>
          <p className="text-gray-600">Connect with friends and share your moments</p>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user.avatar} alt={user.username} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                          {user.username[3]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{user.username}</p>
                        {user.name && <p className="text-sm text-gray-500">{user.name}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSendFriendRequest(user.id)}
                      disabled={sendFriendRequestMutation.isPending}
                      className="gradient-bg text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to Circle
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friend Status */}
        {friendStatus.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Friend Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32">
                <div className="flex space-x-4">
                  {friendStatus.map((friend: any) => (
                    <div key={friend.id} className="flex flex-col items-center space-y-2 min-w-[80px]">
                      <div className="relative">
                        <Avatar className="w-16 h-16 ring-2 ring-blue-500">
                          <AvatarImage src={friend.avatar} alt={friend.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            {friend.username[3]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {friend.hasStory && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <p className="text-xs text-center font-medium truncate w-full">{friend.username}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Chats and Requests */}
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chats" className="flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
              {chats.length > 0 && (
                <Badge variant="secondary" className="ml-2">{chats.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center">
              <UserPlus className="w-4 h-4 mr-2" />
              Requests
              {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{friendRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="space-y-4">
            {selectedChat ? (
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                  <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                      {selectedChat.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedChat.user.username}</h3>
                    <p className="text-sm text-gray-500">Online</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedChat(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 mb-4">
                    <div className="space-y-2">
                      {selectedChat.messages?.map((message: any) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs p-3 rounded-lg ${
                              message.senderId === user?.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!messageText.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {chats.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No chats yet</h3>
                      <p className="text-gray-500">Accept friend requests to start chatting!</p>
                    </CardContent>
                  </Card>
                ) : (
                  chats.map((chat: any) => (
                    <Card key={chat.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedChat(chat)}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={chat.user.avatar} alt={chat.user.username} />
                            <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                              {chat.user.username[3]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{chat.user.username}</h3>
                            <p className="text-sm text-gray-500 truncate">
                              {chat.lastMessage || "Start a conversation"}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {chat.lastMessageTime && new Date(chat.lastMessageTime).toLocaleDateString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {friendRequests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No friend requests</h3>
                  <p className="text-gray-500">Search for users above to send friend requests!</p>
                </CardContent>
              </Card>
            ) : (
              friendRequests.map((request: any) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.user.avatar} alt={request.user.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            {request.user.username[3]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{request.user.username}</h3>
                          <p className="text-sm text-gray-500">Wants to add you to their circle</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleFriendRequest(request.id, 'accept')}
                          disabled={handleFriendRequestMutation.isPending}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleFriendRequest(request.id, 'reject')}
                          disabled={handleFriendRequestMutation.isPending}
                          variant="destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  );
}