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

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  // Get all users for vibes display including current user
  const allUsers = [
    { 
      id: user?.id, 
      username: user?.username, 
      avatar: user?.avatar,
      isCurrentUser: true 
    },
    ...(searchResults.length > 0 ? searchResults : [
      { id: 3, username: "tp-leader", avatar: null },
      { id: 4, username: "tp-firstuser", avatar: null }
    ])
  ].filter((u, index, self) => 
    u.id && self.findIndex(user => user.id === u.id) === index
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 min-h-screen shadow-xl">
        {/* Header */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Your Circle</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Connect with friends
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gradient-to-r from-purple-50 to-pink-50 dark:bg-gray-700 border border-purple-200 dark:border-purple-600 rounded-full h-10 text-sm focus:border-purple-400 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Circle's Vibe Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
              Circle's Vibe
            </h2>
            
            <div className="flex gap-6 justify-center">
              {allUsers.map((vibeUser, index) => (
                <div key={vibeUser.id || index} className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-4 border-gradient-to-r from-purple-300 to-pink-300 shadow-lg">
                      <AvatarImage src={vibeUser.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg font-semibold">
                        {vibeUser.isCurrentUser ? "F" : 
                         vibeUser.username === "tp-leader" ? "L" : 
                         vibeUser.username === "tp-firstuser" ? "F" : 
                         vibeUser.username?.charAt(3)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {vibeUser.isCurrentUser && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-md">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center font-medium">
                    {vibeUser.isCurrentUser ? "Your vibe" : 
                     vibeUser.username === "tp-leader" ? "tp-leader" : 
                     vibeUser.username === "tp-firstuser" ? "tp-firstuser" : 
                     vibeUser.username}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="bg-gradient-to-br from-white to-purple-50/30 dark:bg-gray-800 border-t border-purple-200 dark:border-purple-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-purple-200 dark:border-purple-700">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                activeTab === "chats"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 border-b-2 border-gradient-to-r from-purple-500 to-pink-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
              }`}
            >
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Chats
              {chats.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                  {chats.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                activeTab === "requests"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 border-b-2 border-gradient-to-r from-purple-500 to-pink-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-purple-500"
              }`}
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              Requests
              {friendRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700">
                  {friendRequests.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="h-96 overflow-y-auto">
            {activeTab === "chats" && (
              <div className="p-4 space-y-3">
                {chats.map((chat: any) => (
                  <Link key={chat.id} href={`/chat/${chat.id}`} className="block">
                    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={chat.user?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                          {chat.user?.username?.charAt(3)?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {chat.user?.username}
                        </p>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {chat.lastMessage.content}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {chat.lastMessage && formatDate(chat.lastMessage.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
                {chats.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Add friends to start chatting!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="p-4 space-y-3">
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
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md"
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                      Search Results
                    </h3>
                    {searchResults.map((searchUser: any) => (
                      <div key={searchUser.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={searchUser.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                            {searchUser.username?.charAt(3)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {searchUser.username}
                          </p>
                          {searchUser.bio && (
                            <p className="text-sm text-gray-500">{searchUser.bio}</p>
                          )}
                        </div>
                        {searchUser.id !== user?.id && (
                          <Button
                            size="sm"
                            onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                            disabled={sendFriendRequestMutation.isPending}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md"
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {friendRequests.length === 0 && !searchQuery && (
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
    </div>
  );
}