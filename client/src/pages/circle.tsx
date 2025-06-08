import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, MessageCircle, UserPlus, Plus, Heart, MessageSquare, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { VibeUpload } from "@/components/vibe/vibe-upload";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("timeline");
  const [showVibeUpload, setShowVibeUpload] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 5000,
  });

  // Circle timeline messages (completely separate from DM system)
  const { data: circleMessages = [] } = useQuery({
    queryKey: ["/api/circle/messages"],
    refetchInterval: 5000,
  });

  // Post new Circle message
  const postMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/circle/messages', { content });
    },
    onSuccess: () => {
      toast({
        title: "Message posted",
        description: "Your message has been shared with your Circle.",
      });
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ["/api/circle/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post message",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    }
  });

  // Like/Unlike Circle message
  const toggleLikeMutation = useMutation({
    mutationFn: async (messageId: number) => {
      return apiRequest('POST', `/api/circle/messages/${messageId}/like`);
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

  const { data: vibes = [] } = useQuery({
    queryKey: ["/api/vibes"],
    refetchInterval: 10000,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/friend-requests/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send friend request");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request sent successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to accept friend request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request accepted!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-2">Your Circle</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Share public messages with your friends and connect with others
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-6 h-6" />
            <Input
              type="text"
              placeholder="Search users to add to your Circle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 border-2 border-purple-200 dark:border-purple-600 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-gray-900 dark:text-gray-100 placeholder-purple-500 dark:placeholder-purple-400 text-lg font-medium shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600 w-6 h-6 font-bold text-xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="mb-8 space-y-3">
              {/* Search Results List */}
              {searchResults && searchResults.map((user: any, index: number) => (
                <div key={user.id || index} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-600 shadow-md">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-purple-300">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold">
                        {user.username?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/users/${user.username}`}>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors duration-200">
                          {user.username}
                        </h3>
                      </Link>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sendFriendRequestMutation.mutate(user.id)}
                      disabled={sendFriendRequestMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to Circle
                    </Button>
                  </div>
                </div>
              ))}

              {(!searchResults || searchResults.length === 0) && !isSearching && (
                <div className="text-center py-8 text-red-500 dark:text-red-400">
                  <h4 className="font-bold text-lg">Incorrect username</h4>
                </div>
              )}

              {isSearching && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Searching...</p>
                </div>
              )}
            </div>
          )}

          {/* Circle's Vibe Section */}
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-600">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mb-6">
                Circle's Vibe
              </h2>
              
              <div className="flex gap-6 justify-start">
                {/* Current User Vibe */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-4 border-white shadow-lg cursor-pointer">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-lg font-semibold">
                        {user?.username?.charAt(3)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => setShowVibeUpload(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                    Your vibe
                  </p>
                </div>

                {/* Friend Vibes - Only show users who have active vibes AND are following each other */}
                {Array.isArray(vibes) && vibes.filter((vibe: any) => {
                  if (!vibe.user || vibe.user.id === user?.id) return false;
                  const vibeAge = new Date().getTime() - new Date(vibe.createdAt).getTime();
                  const hasActiveVibe = vibeAge < 24 * 60 * 60 * 1000;
                  const hasContent = vibe.imageUrl || vibe.videoUrl; // Only show if vibe has actual content
                  return hasActiveVibe && hasContent;
                }).slice(0, 2).map((vibe: any) => (
                  <div key={vibe.id} className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-4 border-white shadow-lg cursor-pointer">
                        <AvatarImage src={vibe.user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-lg font-semibold">
                          {vibe.user?.username?.charAt(3)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                      {vibe.user?.username?.replace('tp-', '') || 'Unknown'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === "timeline"
                  ? "text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text border-b-2 border-pink-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Timeline
              {Array.isArray(circleMessages) && circleMessages.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600">
                  {circleMessages.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === "friends"
                  ? "text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text border-b-2 border-pink-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              Friends
              {Array.isArray(friendRequests) && friendRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-600">
                  {friendRequests.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="h-64 overflow-y-auto pb-20">
            {activeTab === "timeline" && (
              <div className="p-4 space-y-4">
                {/* New Message Input */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 border-2 border-purple-300">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-sm">
                        {user?.username?.charAt(3)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Share something with your Circle..."
                        className="min-h-[80px] resize-none border-0 bg-transparent focus:ring-0 text-gray-900 dark:text-gray-100 placeholder-gray-500"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          onClick={() => {
                            if (newMessage.trim()) {
                              postMessageMutation.mutate(newMessage.trim());
                            }
                          }}
                          disabled={!newMessage.trim() || postMessageMutation.isPending}
                          size="sm"
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline Messages */}
                <div className="space-y-3">
                  {Array.isArray(circleMessages) && circleMessages.map((message: any) => (
                    <div key={message.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 border-2 border-purple-300">
                          <AvatarImage src={message.user?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-sm">
                            {message.user?.username?.charAt(3)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {message.user?.username?.replace('tp-', '') || 'Unknown'}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 mb-3 leading-relaxed">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleLikeMutation.mutate(message.id)}
                              disabled={toggleLikeMutation.isPending}
                              className={`flex items-center gap-2 text-sm transition-colors ${
                                message.isLiked 
                                  ? 'text-pink-500 hover:text-pink-600' 
                                  : 'text-gray-500 dark:text-gray-400 hover:text-pink-500'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${message.isLiked ? 'fill-current' : ''}`} />
                              {message.likesCount || 0}
                            </button>
                            <button className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-500 transition-colors">
                              <MessageSquare className="w-4 h-4" />
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!circleMessages || circleMessages.length === 0) && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No timeline messages yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Be the first to share something with your Circle!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "friends" && (
              <div className="p-6 space-y-6">

                {/* Friend Requests */}
                <div className="space-y-3">
                  {Array.isArray(friendRequests) && friendRequests.map((request: any) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={request.user?.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                        {request.user?.username?.charAt(3)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {request.user?.username}
                      </p>
                      <p className="text-sm text-gray-500">wants to connect</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptFriendRequestMutation.mutate(request.id)}
                        disabled={acceptFriendRequestMutation.isPending}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white transition-all duration-200 shadow-lg"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600"
                      >
                        Decline
                      </Button>
                    </div>
                    </div>
                  ))}
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-pink-200 dark:border-gray-600 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <Search className="w-5 h-5 mr-3 text-pink-500" />
                        Search Results for "{searchQuery}"
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-pink-500 text-white text-sm font-medium rounded-full">
                          {searchResults.length} users found
                        </span>
                        {isSearching && (
                          <div className="animate-spin w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4 min-h-[100px]">
                      {searchResults.length > 0 ? (
                        searchResults
                          .filter((searchUser: any) => searchUser.id !== user?.id)
                          .map((searchUser: any) => (
                            <div key={searchUser.id} className="flex items-center gap-4 p-5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-600 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                              <Avatar className="w-16 h-16 border-3 border-pink-300 dark:border-pink-600">
                                <AvatarImage src={searchUser.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold text-xl">
                                  {searchUser.username?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">
                                  {searchUser.username}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {searchUser.bio || "No bio available"}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-pink-400 rounded-full"></span>
                                    {searchUser.followersCount} followers
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                                    {searchUser.followingCount} following
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-3">
                                <Link 
                                  href={`/users/${searchUser.username}`}
                                  className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 rounded-lg transition-all duration-200 text-center border border-blue-200 dark:border-blue-700"
                                >
                                  View Profile
                                </Link>
                                <Button
                                  size="sm"
                                  onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                                  disabled={sendFriendRequestMutation.isPending}
                                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                                >
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Add to Circle
                                </Button>
                              </div>
                            </div>
                          ))
                      ) : !isSearching ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <UserPlus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                          <h4 className="font-bold text-xl mb-2">No users found</h4>
                          <p className="text-sm">Try searching with different keywords</p>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                          <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                          <h4 className="font-bold text-xl">Searching users...</h4>
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {(!Array.isArray(friendRequests) || friendRequests.length === 0) && !searchQuery && (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No friend requests</p>
                    <p className="text-sm">Use the search above to find friends</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <Navigation />

        {/* Vibe Upload Modal */}
        {showVibeUpload && (
          <VibeUpload onClose={() => setShowVibeUpload(false)} />
        )}
      </div>
    </div>
  );
}