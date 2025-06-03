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
                {searchResults.filter((searchUser: any) => searchUser.id !== user?.id).map((searchUser: any) => (
                  <div key={searchUser.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={searchUser.avatar} alt={searchUser.username} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                          {searchUser.username[3]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{searchUser.username}</p>
                        {searchUser.name && <p className="text-sm text-gray-500">{searchUser.name}</p>}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSendFriendRequest(searchUser.id)}
                      disabled={sendFriendRequestMutation.isPending}
                      className="gradient-bg text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to Circle
                    </Button>
                  </div>
                ))}
                {searchResults.filter((searchUser: any) => searchUser.id !== user?.id).length === 0 && (
                  <div className="text-center p-4 text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Circle's Vibe */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Circle's Vibe</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="flex space-x-4">
                {/* Add Your Status */}
                <div className="flex flex-col items-center space-y-2 min-w-[80px]">
                  <div className="relative">
                    <Avatar className="w-16 h-16 ring-2 ring-gray-300 cursor-pointer hover:ring-blue-500 transition-colors">
                      <AvatarImage src={user?.avatar} alt="Your status" />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                        {user?.username?.[3]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-blue-600"
                      onClick={() => document.getElementById('status-upload')?.click()}
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <input
                      id="status-upload"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const formData = new FormData();
                            formData.append('media', file);
                            formData.append('caption', '');
                            
                            const response = await fetch('/api/stories', {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
                              },
                              body: formData,
                            });
                            
                            if (response.ok) {
                              // Refresh stories
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Error uploading status:', error);
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-center font-medium">Your vibe</p>
                </div>

                {/* Friends' Status */}
                {friendStatus.map((friend: any) => (
                  <div key={friend.id} className="flex flex-col items-center space-y-2 min-w-[80px]">
                    <div className="relative">
                      <Avatar className={`w-16 h-16 ring-2 cursor-pointer ${friend.hasStory ? 'ring-gradient-to-r from-pink-500 to-purple-600' : 'ring-gray-300'}`}>
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
              <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center p-4 border-b bg-white shadow-sm">
                  <Button variant="ghost" onClick={() => setSelectedChat(null)} className="mr-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                      {selectedChat.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedChat.user.username}</h3>
                    <p className="text-sm text-green-500">Online</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="rounded-full" title="Voice Call">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full" title="Video Call">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="sm" className="rounded-full" title="Settings">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{
                    backgroundImage: 'linear-gradient(to bottom, #1e3a8a, #059669)',
                    minHeight: 'calc(100vh - 140px)'
                  }}
                >
                  {selectedChat.messages?.map((message: any, index: number) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.senderId !== user?.id && (
                        <Avatar className="w-8 h-8 mr-2 mt-1">
                          <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs">
                            {selectedChat.user.username[3]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl shadow-sm ${
                          message.senderId === user?.id
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-white text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white border-t">
                  <div className="flex items-center space-x-2">
                    {/* File Upload Button */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-full p-2"
                      onClick={() => document.getElementById('chat-file-upload')?.click()}
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </Button>
                    <input
                      id="chat-file-upload"
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file upload
                          console.log('File selected:', file.name);
                        }
                      }}
                    />

                    {/* Camera Button */}
                    <Button variant="ghost" size="sm" className="rounded-full p-2">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Button>

                    {/* Message Input Field */}
                    <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
                      <Input
                        placeholder="Message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="border-none bg-transparent focus:ring-0 focus:outline-none text-sm"
                      />
                      
                      {/* Emoji Button */}
                      <Button variant="ghost" size="sm" className="p-1 ml-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </Button>
                    </div>

                    {/* Audio Record or Send Button */}
                    {messageText.trim() ? (
                      <Button 
                        onClick={handleSendMessage}
                        className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-2"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full p-2"
                        onMouseDown={() => {
                          // Start audio recording
                          console.log('Start recording');
                        }}
                        onMouseUp={() => {
                          // Stop audio recording
                          console.log('Stop recording');
                        }}
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
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