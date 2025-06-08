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
import { apiRequest } from "@/lib/queryClient";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showVibeUpload, setShowVibeUpload] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 5000,
  });

  // Vibes (Stories) for close friends only - like WhatsApp Status
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

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", "/api/friend-requests", { userId });
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
      return apiRequest("PATCH", `/api/friend-requests/${requestId}`, { action });
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

  const sendMessageRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest("POST", "/api/message-requests", { userId });
    },
    onSuccess: () => {
      toast({
        title: "Message request sent",
        description: "Your message request has been sent for business contact.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send request",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-4 pt-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Circle
          </h1>
          <p className="text-gray-600">Share private moments with close friends and family</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search for friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Search Results</h3>
            {isSearching ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No users found</p>
            ) : (
              <div className="space-y-3">
                {searchResults.map((searchUser: any) => (
                  <div key={searchUser.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={searchUser.avatar} alt={searchUser.username} />
                        <AvatarFallback>{searchUser.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{searchUser.username}</h4>
                        <p className="text-sm text-gray-500">{searchUser.displayName}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                        disabled={sendFriendRequestMutation.isPending}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add Friend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendMessageRequestMutation.mutate(searchUser.id)}
                        disabled={sendMessageRequestMutation.isPending}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Friend Requests</h3>
            <div className="space-y-3">
              {friendRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={request.requester.avatar} alt={request.requester.username} />
                      <AvatarFallback>{request.requester.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{request.requester.username}</h4>
                      <p className="text-sm text-gray-500">Wants to be friends</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => respondToFriendRequestMutation.mutate({ requestId: request.id, action: "accept" })}
                      disabled={respondToFriendRequestMutation.isPending}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToFriendRequestMutation.mutate({ requestId: request.id, action: "reject" })}
                      disabled={respondToFriendRequestMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stories/Vibes Section */}
        <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Stories</h3>
            <Button
              onClick={() => setShowVibeUpload(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Story
            </Button>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {/* My Story */}
            <div className="flex-shrink-0 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={user?.avatar} alt={user?.username} />
                      <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-xs mt-1 font-medium">Your Story</p>
            </div>

            {/* Friends' Stories */}
            {vibes.map((vibe: any) => (
              <div key={vibe.id} className="flex-shrink-0 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-white overflow-hidden">
                    {vibe.imageUrl ? (
                      <img src={vibe.imageUrl} alt="Story" className="w-full h-full object-cover" />
                    ) : (
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={vibe.user?.avatar} alt={vibe.user?.username} />
                        <AvatarFallback>{vibe.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
                <p className="text-xs mt-1 truncate w-16">{vibe.user?.username}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Friends List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Friends</h3>
          {chats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No friends yet</p>
              <p className="text-sm text-gray-400">Search and add friends to start sharing private moments!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat: any) => (
                <Link key={chat.id} href={`/chat/${chat.id}`}>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={chat.user?.avatar} alt={chat.user?.username} />
                        <AvatarFallback>{chat.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{chat.user?.username}</h4>
                        <p className="text-sm text-gray-500">Click to chat privately</p>
                      </div>
                    </div>
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vibe Upload Modal */}
      {showVibeUpload && (
        <VibeUpload
          isOpen={showVibeUpload}
          onClose={() => setShowVibeUpload(false)}
          onSuccess={() => {
            setShowVibeUpload(false);
            queryClient.invalidateQueries({ queryKey: ["/api/vibes"] });
          }}
        />
      )}
    </div>
  );
}