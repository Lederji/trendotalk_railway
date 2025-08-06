import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, MessageCircle, UserPlus, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Navigation } from "@/components/layout/navigation";
import { VibeUpload } from "@/components/vibe/vibe-upload";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [showVibeUpload, setShowVibeUpload] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
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
      console.log("Search results for:", searchQuery, "->", data);
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
        title: "Friend request sent!",
        description: "Your friend request has been sent successfully.",
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
        title: "Friend request accepted!",
        description: "You are now friends.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const vibesWithUsers = Array.isArray(vibes) 
    ? vibes.filter((vibe: any) => vibe.user && vibe.user.username)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      {showVibeUpload && (
        <VibeUpload
          onClose={() => setShowVibeUpload(false)}
          onSuccess={() => {
            setShowVibeUpload(false);
            queryClient.invalidateQueries({ queryKey: ["/api/vibes"] });
          }}
        />
      )}

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Circle</h1>
                <p className="text-purple-100">Connect with friends and share vibes</p>
              </div>
              <Button
                onClick={() => setShowVibeUpload(true)}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Vibe
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === "chats"
                  ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20"
              }`}
            >
              <MessageCircle className="w-5 h-5 mr-2 inline" />
              Chats
            </button>
            <button
              onClick={() => setActiveTab("vibes")}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === "vibes"
                  ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20"
              }`}
            >
              Circle Vibes ({vibesWithUsers.length})
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                activeTab === "requests"
                  ? "text-purple-600 border-b-2 border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                  : "text-gray-600 dark:text-gray-400 hover:text-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/20"
              }`}
            >
              <UserPlus className="w-5 h-5 mr-2 inline" />
              Requests
              {Array.isArray(friendRequests) && friendRequests.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{friendRequests.length}</Badge>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {/* Chats Tab */}
            {activeTab === "chats" && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Your Conversations</h2>
                <div className="space-y-4">
                  {Array.isArray(chats) && chats.length > 0 ? (
                    chats.map((chat: any) => (
                      <Link key={chat.id} href={`/chat/${chat.id}`}>
                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
                          <Avatar className="w-14 h-14">
                            <AvatarImage src={chat.user?.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                              {chat.user?.username?.charAt(0)?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {chat.user?.username}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {chat.lastMessage || "No messages yet"}
                            </p>
                          </div>
                          <MessageCircle className="w-5 h-5 text-purple-500" />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-xl font-semibold mb-2">No conversations yet</h3>
                      <p>Start chatting with friends from your Circle!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vibes Tab */}
            {activeTab === "vibes" && (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Circle Vibes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vibesWithUsers.length > 0 ? (
                    vibesWithUsers.map((vibe: any) => (
                      <div key={vibe.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={vibe.user?.avatar} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white">
                                {vibe.user?.username?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {vibe.user?.username}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(vibe.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {vibe.text && (
                            <p className="text-gray-800 dark:text-gray-200 mb-3">{vibe.text}</p>
                          )}
                          {vibe.imageUrl && (
                            <div className="relative w-full aspect-[9/16] bg-black rounded-lg mb-3 overflow-hidden">
                              <img
                                src={vibe.imageUrl}
                                alt="Vibe"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {vibe.videoUrl && (
                            <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden">
                              <video
                                src={vibe.videoUrl}
                                controls
                                className="w-full h-full object-cover"
                                playsInline
                                loop
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                        <Plus className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">No vibes yet</h3>
                      <p>Share your first vibe with the Circle!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === "requests" && (
              <div className="p-6 space-y-6">
                {/* Search Box */}
                <div className="relative">
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

                {/* Friend Requests */}
                {Array.isArray(friendRequests) && friendRequests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Friend Requests</h3>
                    {friendRequests.map((request: any) => (
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
                )}

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-800/30 dark:via-pink-800/30 dark:to-blue-800/30 rounded-2xl border-2 border-purple-200 dark:border-purple-600 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <Search className="w-6 h-6 mr-3 text-purple-500" />
                        Search Results for "{searchQuery}"
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-full shadow-md">
                          {searchResults.length} users found
                        </span>
                        {isSearching && (
                          <div className="animate-spin w-6 h-6 border-3 border-purple-500 border-t-transparent rounded-full"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-5 min-h-[120px]">
                      {searchResults.length > 0 ? (
                        searchResults
                          .filter((searchUser: any) => searchUser.id !== user?.id)
                          .map((searchUser: any) => (
                            <div key={searchUser.id} className="flex items-center gap-5 p-6 bg-white dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-600 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm">
                              <Avatar className="w-20 h-20 border-4 border-purple-300 dark:border-purple-600 shadow-lg">
                                <AvatarImage src={searchUser.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white font-bold text-2xl">
                                  {searchUser.username?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xl mb-2">
                                  {searchUser.username}
                                </h4>
                                <p className="text-base text-gray-600 dark:text-gray-400 mb-3">
                                  {searchUser.bio || "No bio available"}
                                </p>
                                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-500">
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                                    {searchUser.followersCount || 0} followers
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-pink-400 rounded-full"></span>
                                    {searchUser.followingCount || 0} following
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-3">
                                <Link 
                                  href={`/users/${searchUser.username}`}
                                  className="px-6 py-3 text-base font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-800/40 rounded-xl transition-all duration-200 text-center border-2 border-purple-200 dark:border-purple-700 shadow-md hover:shadow-lg"
                                >
                                  View Profile
                                </Link>
                                <Button
                                  size="lg"
                                  onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                                  disabled={sendFriendRequestMutation.isPending}
                                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base"
                                >
                                  <UserPlus className="w-5 h-5 mr-2" />
                                  Add to Circle
                                </Button>
                              </div>
                            </div>
                          ))
                      ) : !isSearching ? (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                          <UserPlus className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                          <h4 className="font-bold text-2xl mb-3">No users found</h4>
                          <p className="text-lg">Try searching with different keywords</p>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                          <h4 className="font-bold text-2xl">Searching users...</h4>
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
      </div>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}