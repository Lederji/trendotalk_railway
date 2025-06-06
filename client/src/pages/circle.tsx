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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 min-h-screen">
        {/* Header */}
        <div className="px-6 py-6">
          <h1 className="text-2xl font-bold text-pink-500 mb-2">Your Circle</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Connect with friends and share your moments
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-100 dark:bg-gray-700 border-none rounded-full h-12"
            />
          </div>

          {/* Circle's Vibe Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
              Circle's Vibe
            </h2>
            
            <div className="flex gap-6 justify-center">
              {allUsers.map((vibeUser, index) => (
                <div key={vibeUser.id || index} className="flex flex-col items-center">
                  <div className="relative">
                    <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                      <AvatarImage src={vibeUser.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-lg font-semibold">
                        {vibeUser.isCurrentUser ? "F" : 
                         vibeUser.username === "tp-leader" ? "L" : 
                         vibeUser.username === "tp-firstuser" ? "F" : 
                         vibeUser.username?.charAt(3)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {vibeUser.isCurrentUser && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
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
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === "chats"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Chats
              {chats.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-pink-100 text-pink-600">
                  {chats.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 px-6 py-4 text-center font-medium ${
                activeTab === "requests"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <UserPlus className="w-5 h-5 inline mr-2" />
              Requests
              {friendRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-pink-100 text-pink-600">
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
                        className="bg-pink-500 hover:bg-pink-600 text-white"
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
                            className="bg-pink-500 hover:bg-pink-600 text-white"
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