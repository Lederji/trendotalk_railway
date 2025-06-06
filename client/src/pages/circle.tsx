import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, MessageCircle, Check, X, Clock, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("vibes");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 5000,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length > 0,
  });

  const { data: vibes = [] } = useQuery({
    queryKey: ["/api/vibes"],
    refetchInterval: 30000,
  });

  const { data: chats = [] } = useQuery({
    queryKey: ["/api/chats"],
    refetchInterval: 5000,
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

  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/friend-requests/${requestId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to reject friend request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
  });

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">
            Circle
          </h1>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === "vibes" ? "default" : "outline"}
              onClick={() => setActiveTab("vibes")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Heart className="w-4 h-4 mr-2" />
              Vibes
            </Button>
            <Button
              variant={activeTab === "friends" ? "default" : "outline"}
              onClick={() => setActiveTab("friends")}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friends
            </Button>
            <Button
              variant={activeTab === "chats" ? "default" : "outline"}
              onClick={() => setActiveTab("chats")}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chats
            </Button>
          </div>

          {/* Vibes Tab */}
          {activeTab === "vibes" && (
            <div className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-purple-200 dark:bg-gray-800/70 dark:border-purple-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Active Vibes
                    <Badge variant="secondary">{vibes.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {vibes.map((vibe: any) => (
                      <Card key={vibe.id} className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-700">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={vibe.user?.avatar} />
                              <AvatarFallback className="bg-purple-500 text-white">
                                {vibe.user?.username?.slice(3, 5).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{vibe.user?.username}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {getTimeRemaining(vibe.expiresAt)} left
                              </div>
                            </div>
                          </div>
                          {vibe.imageUrl && (
                            <img 
                              src={vibe.imageUrl} 
                              alt={vibe.title}
                              className="w-full h-32 object-cover rounded-lg mb-3"
                            />
                          )}
                          {vibe.title && (
                            <h3 className="font-semibold text-sm mb-2">{vibe.title}</h3>
                          )}
                          {vibe.content && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">{vibe.content}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {vibes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No active vibes right now</p>
                      <p className="text-sm">Share your vibe to connect with friends!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add Friends Tab */}
          {activeTab === "friends" && (
            <div className="space-y-6">
              {/* Friend Requests */}
              {friendRequests.length > 0 && (
                <Card className="bg-white/70 backdrop-blur-sm border-blue-200 dark:bg-gray-800/70 dark:border-blue-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      Friend Requests
                      <Badge variant="secondary">{friendRequests.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {friendRequests.map((request: any) => (
                        <div key={request.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={request.user?.avatar} />
                              <AvatarFallback className="bg-blue-500 text-white">
                                {request.user?.username?.slice(3, 5).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.user?.username}</p>
                              <p className="text-sm text-gray-500">wants to connect</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => acceptFriendRequestMutation.mutate(request.id)}
                              disabled={acceptFriendRequestMutation.isPending}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectFriendRequestMutation.mutate(request.id)}
                              disabled={rejectFriendRequestMutation.isPending}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search Users */}
              <Card className="bg-white/70 backdrop-blur-sm border-purple-200 dark:bg-gray-800/70 dark:border-purple-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-purple-500" />
                    Find Friends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by username (e.g., tp-leader)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/70 border-purple-200 focus:border-purple-400"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    {searchResults.map((searchUser: any) => (
                      <div key={searchUser.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={searchUser.avatar} />
                            <AvatarFallback className="bg-purple-500 text-white">
                              {searchUser.username?.slice(3, 5).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{searchUser.username}</p>
                            {searchUser.bio && (
                              <p className="text-sm text-gray-500">{searchUser.bio}</p>
                            )}
                          </div>
                        </div>
                        {searchUser.id !== user?.id && (
                          <Button
                            size="sm"
                            onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                            disabled={sendFriendRequestMutation.isPending}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add to Circle
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {searchQuery && searchResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No users found</p>
                      <p className="text-sm">Try searching for usernames starting with "tp-"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Chats Tab */}
          {activeTab === "chats" && (
            <Card className="bg-white/70 backdrop-blur-sm border-green-200 dark:bg-gray-800/70 dark:border-green-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                  Messages
                  <Badge variant="secondary">{chats.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chats.map((chat: any) => (
                    <Link 
                      key={chat.id} 
                      href={`/chat/${chat.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <Avatar>
                          <AvatarImage src={chat.user?.avatar} />
                          <AvatarFallback className="bg-green-500 text-white">
                            {chat.user?.username?.slice(3, 5).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{chat.user?.username}</p>
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-500 truncate">
                              {chat.lastMessage.content}
                            </p>
                          )}
                        </div>
                        <MessageCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </Link>
                  ))}
                </div>
                
                {chats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Add friends to start chatting!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}