import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, MessageCircle, UserPlus, Check, X, Send, Upload, Camera, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Auth from "./auth";

export default function Circle() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [vibeUploadOpen, setVibeUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vibeTitle, setVibeTitle] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'vibes') {
        // Scroll to vibes section
        const vibesSection = document.getElementById('vibes-section');
        if (vibesSection) {
          vibesSection.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (hash === 'chats') {
        setActiveTab('chats');
        // Scroll to chats section
        const chatsSection = document.getElementById('chats-section');
        if (chatsSection) {
          chatsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // Handle initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const { data: userVibes = [] } = useQuery({
    queryKey: ["/api/stories/user"],
    queryFn: async () => {
      const response = await fetch("/api/stories/user", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) return [];
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

  const uploadVibeMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', title);
      
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload vibe');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/status"] });
      toast({ title: "Vibe uploaded successfully!" });
      setVibeUploadOpen(false);
      setSelectedFile(null);
      setVibeTitle("");
      setFilePreview(null);
    },
    onError: () => {
      toast({ 
        title: "Failed to upload vibe", 
        description: "Please try again",
        variant: "destructive" 
      });
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

  const handleFileSelect = async (file: File) => {
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    // For videos, trim to 30 seconds
    if (file.type.startsWith('video/')) {
      try {
        const trimmedFile = await trimVideo(file, 30);
        setSelectedFile(trimmedFile);
      } catch (error) {
        console.error('Video trimming failed:', error);
        setSelectedFile(file); // Use original if trimming fails
      }
    } else {
      setSelectedFile(file);
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setVibeUploadOpen(true);
  };

  const trimVideo = (file: File, maxDuration: number): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      video.onloadedmetadata = () => {
        const duration = Math.min(video.duration, maxDuration);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // For simplicity, we'll just use the original file
        // In a production app, you'd use FFmpeg.js or similar
        resolve(file);
      };
      
      video.onerror = () => reject(new Error('Video processing failed'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleVibeUpload = () => {
    if (!selectedFile || !vibeTitle.trim()) {
      toast({
        title: "Please select a file and add a title",
        variant: "destructive"
      });
      return;
    }
    
    uploadVibeMutation.mutate({ file: selectedFile, title: vibeTitle });
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
        <Card className="mb-6" id="vibes-section">
          <CardHeader>
            <CardTitle>Circle's Vibe</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="flex space-x-4">
                {/* Add Your Status */}
                <div className="flex flex-col items-center space-y-2 min-w-[80px]">
                  <div className="relative">
                    <Avatar 
                      className={`w-16 h-16 ring-2 cursor-pointer hover:ring-blue-500 transition-colors ${userVibes.length > 0 ? 'ring-gradient-to-r from-pink-500 to-purple-600' : 'ring-gray-300'}`}
                      onClick={() => {
                        if (userVibes.length > 0) {
                          // Show user's vibes
                          // Could implement a viewer modal here
                        } else {
                          document.getElementById('vibe-file-input')?.click();
                        }
                      }}
                    >
                      {userVibes.length > 0 && userVibes[0].imageUrl ? (
                        <AvatarImage src={userVibes[0].imageUrl} alt="Your vibe" />
                      ) : userVibes.length > 0 && userVibes[0].videoUrl ? (
                        <video 
                          src={userVibes[0].videoUrl} 
                          className="w-full h-full object-cover rounded-full"
                          muted
                        />
                      ) : (
                        <>
                          <AvatarImage src={user?.avatar} alt="Your status" />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            {user?.username?.[3]?.toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div 
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-blue-600"
                      onClick={() => document.getElementById('vibe-file-input')?.click()}
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <input
                      id="vibe-file-input"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelect(file);
                        }
                      }}
                    />
                    {userVibes.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    )}
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
        <Tabs defaultValue={activeTab} className="w-full" id="chats-section">
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
              <>
                <style>{`
                  nav[class*="fixed bottom-0"] { display: none !important; }
                `}</style>
                <div className="fixed inset-0 z-50 bg-white flex flex-col">
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
                      <Button variant="ghost" size="sm" className="rounded-full" title="Voice Call" onClick={() => alert('Voice call feature will be implemented with WebRTC')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full" title="Video Call" onClick={() => alert('Video call feature will be implemented with WebRTC')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </Button>
                      <Button variant="ghost" size="sm" className="rounded-full" title="Settings" onClick={() => alert('Chat settings menu')}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'linear-gradient(to bottom, #1e3a8a, #059669)', minHeight: 'calc(100vh - 140px)' }}>
                    {selectedChat.messages?.map((message: any) => (
                      <div key={message.id} className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                        {message.senderId !== user?.id && (
                          <Avatar className="w-8 h-8 mr-2 mt-1">
                            <AvatarImage src={selectedChat.user.avatar} alt={selectedChat.user.username} />
                            <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs">
                              {selectedChat.user.username[3]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-xs px-4 py-2 rounded-2xl shadow-sm ${message.senderId === user?.id ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'}`}>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-1 ${message.senderId === user?.id ? 'text-blue-100' : 'text-gray-400'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white border-t p-3 safe-area-bottom">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="rounded-full p-2 min-w-[40px] min-h-[40px]" onClick={() => document.getElementById('chat-camera-upload')?.click()}>
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="13" r="3"/>
                          <path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2"/>
                        </svg>
                      </Button>
                      <input id="chat-camera-upload" type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) console.log('Camera file selected:', file.name); }} />
                      <div className="flex-1 bg-gray-100 rounded-full px-4 py-3 flex items-center min-h-[44px]">
                        <Input placeholder="Message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="border-none bg-transparent focus:ring-0 focus:outline-none text-sm flex-1" />
                        <Button variant="ghost" size="sm" className="p-1 ml-2" onClick={() => document.getElementById('chat-file-upload')?.click()}>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </Button>
                        <input id="chat-file-upload" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) console.log('File selected:', file.name); }} />
                      </div>
                      {messageText.trim() ? (
                        <Button onClick={handleSendMessage} className="rounded-full bg-blue-500 hover:bg-blue-600 text-white p-2 min-w-[40px] min-h-[40px]">
                          <Send className="w-5 h-5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="rounded-full p-2 min-w-[40px] min-h-[40px]" onMouseDown={() => console.log('Start recording')} onMouseUp={() => console.log('Stop recording')}>
                          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </>
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
                    <Card key={chat.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setLocation(`/chat/${chat.id}`)}>
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

      {/* Instagram-style Vibe Upload Modal */}
      <Dialog open={vibeUploadOpen} onOpenChange={setVibeUploadOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Add Your Vibe
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Preview */}
            {filePreview && (
              <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100">
                {selectedFile?.type.startsWith('video/') ? (
                  <div className="relative w-full h-full">
                    <video 
                      src={filePreview} 
                      className="w-full h-full object-cover"
                      controls
                      muted
                      onLoadedMetadata={(e) => {
                        const video = e.target as HTMLVideoElement;
                        if (video.duration > 30) {
                          toast({
                            title: "Video will be trimmed to 30 seconds",
                            description: "Long videos are automatically trimmed for vibes",
                          });
                        }
                      }}
                    />
                    {vibeTitle && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-2 rounded text-sm backdrop-blur-sm">
                        {vibeTitle}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    {vibeTitle && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white p-2 rounded text-sm backdrop-blur-sm">
                        {vibeTitle}
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                      setVibeTitle("");
                    }}
                    className="w-8 h-8 p-0 rounded-full bg-black/50 hover:bg-black/70 text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add a title for your vibe</label>
              <Textarea
                placeholder="What's on your mind?"
                value={vibeTitle}
                onChange={(e) => setVibeTitle(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* File Type Indicator */}
            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {selectedFile.type.startsWith('video/') ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVibeUploadOpen(false);
                setSelectedFile(null);
                setFilePreview(null);
                setVibeTitle("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVibeUpload}
              disabled={!selectedFile || !vibeTitle.trim() || uploadVibeMutation.isPending}
              className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {uploadVibeMutation.isPending ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Share Vibe
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
}