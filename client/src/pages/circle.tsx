import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, MessageCircle, UserPlus, Plus, Send, Heart, MoreHorizontal, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { VibeUpload } from "@/components/vibe/vibe-upload";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showVibeUpload, setShowVibeUpload] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("chats");
  const [selectedVibe, setSelectedVibe] = useState<any>(null);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Circle messages for timeline (different from regular chats)
  const { data: circleMessages = [] } = useQuery({
    queryKey: ["/api/circle/messages"],
    refetchInterval: 3000,
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 5000,
  });

  const { data: vibes = [] } = useQuery({
    queryKey: ["/api/vibes"],
    refetchInterval: 5000,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    refetchInterval: 5000,
  });

  // Post Circle message to timeline
  const postCircleMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/circle/messages", { content });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/circle/messages"] });
      toast({
        title: "Message posted",
        description: "Your message has been shared in your circle.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post message",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", `/api/friend-requests/${userId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send request",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const respondToFriendRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: number; action: "accept" | "reject" }) => {
      return apiRequest("POST", `/api/friend-requests/${requestId}/${action}`, {});
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === "accept" ? "Friend request accepted" : "Friend request declined",
        description: variables.action === "accept" 
          ? "You are now friends and can share private moments!" 
          : "Friend request has been declined.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest("POST", `/api/circle/messages/${messageId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circle/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Action failed",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  const handlePostMessage = () => {
    if (newMessage.trim()) {
      postCircleMessageMutation.mutate(newMessage.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-md mx-auto bg-white min-h-screen pb-nav">
        {/* Header like home page */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold gradient-text">
              Your Circle
            </h1>
          </div>
        </header>
        
        {/* Search */}
        <div className="px-4 py-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 border-0 rounded-full"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="bg-white border-b">
            <div className="p-4">
              <h3 className="font-semibold mb-3">Search Results</h3>
              {isSearching ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No users found</p>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((searchUser: any) => (
                    <div key={searchUser.id} className="flex items-center justify-between p-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={searchUser.avatar} alt={searchUser.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            {searchUser.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-sm">{searchUser.username}</h4>
                          <p className="text-xs text-gray-500">{searchUser.displayName}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                        disabled={sendFriendRequestMutation.isPending}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-xs px-3 py-1 h-8"
                      >
                        <UserPlus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Circle's Vibe Section */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Circle's Vibe</h3>
            <Button
              onClick={() => setShowVibeUpload(true)}
              size="sm"
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 rounded-full w-8 h-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {/* Sort vibes: User's own vibes first, then others */}
            {vibes
              .filter((vibe: any) => vibe.imageUrl || vibe.videoUrl)
              .sort((a: any, b: any) => {
                // Put current user's vibes first
                if (a.userId === user?.id && b.userId !== user?.id) return -1;
                if (a.userId !== user?.id && b.userId === user?.id) return 1;
                return 0;
              })
              .map((vibe: any) => {
                const isOwnVibe = vibe.userId === user?.id;
                return (
                  <div 
                    key={vibe.id} 
                    className="flex-shrink-0 text-center cursor-pointer"
                    onClick={() => {
                      setSelectedVibe(vibe);
                      setShowVibeModal(true);
                    }}
                  >
                    <Avatar className="w-16 h-16 ring-2 ring-pink-500 ring-offset-2 hover:ring-4 transition-all">
                      <AvatarImage 
                        src={vibe.imageUrl || vibe.videoUrl || '/placeholder-vibe.jpg'} 
                        alt="Vibe" 
                      />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        {vibe.user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs mt-2 truncate w-16 font-medium">
                      {isOwnVibe ? 'Your vibe' : vibe.user?.username}
                    </p>
                  </div>
                );
              })}

            {/* Show "Your vibe" placeholder only if user has no vibes */}
            {vibes.filter((vibe: any) => vibe.userId === user?.id && (vibe.imageUrl || vibe.videoUrl)).length === 0 && (
              <div className="flex-shrink-0 text-center">
                <div className="relative">
                  <Avatar className="w-16 h-16 ring-2 ring-gray-300 ring-offset-2">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback className="bg-gray-300 text-gray-600 text-lg">
                      {user?.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-xs mt-2 font-medium text-gray-500">Your vibe</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Messages Section */}
        <div className="flex-1 bg-white">
          {/* Circle Messages Timeline */}
          <div className="space-y-4 p-4">
            {circleMessages.length > 0 && circleMessages.map((message: any) => (
                <div key={message.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={message.user?.avatar} alt={message.user?.username} />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        {message.user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{message.user?.username}</h4>
                        <span className="text-xs text-gray-500">
                          {format(new Date(message.createdAt), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{message.content}</p>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleLikeMutation.mutate(message.id)}
                          className="flex items-center space-x-1 text-gray-500 hover:text-pink-500 transition-colors"
                        >
                          <Heart className={`w-4 h-4 ${message.isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                          <span className="text-xs">{message.likesCount || 0}</span>
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Bottom Tabs */}
        <div className="bg-white border-t p-4">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="chats" className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4" />
                <span>Chats</span>
                <span className="bg-pink-500 text-white rounded-full text-xs px-2 py-0.5 ml-1">
                  {chats.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4" />
                <span>Requests</span>
                {friendRequests.length > 0 && (
                  <span className="bg-red-500 text-white rounded-full text-xs px-2 py-0.5 ml-1">
                    {friendRequests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="mt-4">
              {chats.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No chats yet</p>
                  <p className="text-sm text-gray-400">Add friends to start chatting!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat: any) => (
                    <Link key={chat.id} href={`/chat/${chat.id}`}>
                      <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={chat.user?.avatar} alt={chat.user?.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            {chat.user?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{chat.user?.username}</h4>
                          <p className="text-sm text-gray-500">{chat.lastMessage || "Start chatting"}</p>
                        </div>
                        <div className="text-right flex items-center">
                          {/* Show notification badge for unread messages */}
                          {chat.unreadCount && chat.unreadCount > 0 ? (
                            <div className="bg-red-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                              <span className="text-xs font-medium">
                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                              </span>
                            </div>
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              {friendRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No friend requests</p>
                  <p className="text-sm text-gray-400">People you add will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.user?.avatar} alt={request.user?.username} />
                          <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            {request.user?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{request.user?.username}</h4>
                          <p className="text-sm text-gray-500">Wants to be friends</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => respondToFriendRequestMutation.mutate({ requestId: request.id, action: "accept" })}
                          disabled={respondToFriendRequestMutation.isPending}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 text-xs px-3 py-1 h-8"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToFriendRequestMutation.mutate({ requestId: request.id, action: "reject" })}
                          disabled={respondToFriendRequestMutation.isPending}
                          className="text-xs px-3 py-1 h-8"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Vibe Upload Modal */}
      {showVibeUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <VibeUpload
              onClose={() => setShowVibeUpload(false)}
              onSuccess={() => {
                setShowVibeUpload(false);
                queryClient.invalidateQueries({ queryKey: ["/api/vibes"] });
              }}
            />
          </div>
        </div>
      )}

      {/* Full Screen Vibe Viewer - Instagram Stories Style */}
      {showVibeModal && selectedVibe && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={(e) => {
            // Close modal when clicking on the background
            if (e.target === e.currentTarget) {
              setShowVibeModal(false);
              setSelectedVibe(null);
            }
          }}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowVibeModal(false);
              setSelectedVibe(null);
            }}
            className="absolute top-4 right-4 z-[100] bg-black bg-opacity-50 rounded-full p-2 text-white hover:bg-opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-white"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* User Info */}
          <div className="absolute top-4 left-4 z-[90] flex items-center space-x-3 text-white">
            <Avatar className="w-10 h-10 ring-2 ring-white">
              <AvatarImage src={selectedVibe.user?.avatar} alt={selectedVibe.user?.username} />
              <AvatarFallback className="bg-gray-600 text-white">
                {selectedVibe.user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{selectedVibe.user?.username}</p>
              <p className="text-xs opacity-75">{new Date(selectedVibe.createdAt).toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Content - Portrait 9:16 format like Instagram Reels/WhatsApp Status */}
          <div className="relative w-full h-full flex items-center justify-center z-10">
            <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black overflow-hidden rounded-lg">
              {selectedVibe.videoUrl ? (
                <video
                  src={selectedVibe.videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : selectedVibe.imageUrl ? (
                <img
                  src={selectedVibe.imageUrl}
                  alt="Vibe"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-center">
                  <div>
                    <p className="text-lg mb-4">No media content</p>
                    {selectedVibe.title && (
                      <p className="text-gray-300">{selectedVibe.title}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title/Caption */}
          {selectedVibe.title && (
            <div className="absolute bottom-4 left-4 right-4 z-[90] text-white">
              <p className="text-center bg-black bg-opacity-50 rounded-lg p-3">
                {selectedVibe.title}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}