import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, MessageCircle, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
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

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/friend-requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to accept request");
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/friend-requests/${requestId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to reject request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Friend request rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Circle</h1>
          <p className="text-white/80">Connect with friends</p>
        </div>

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests ({friendRequests.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {friendRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.fromUser?.avatar} />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                        {request.fromUser?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.fromUser?.username || 'Unknown User'}</p>
                      <p className="text-sm text-gray-500">wants to connect</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => acceptRequestMutation.mutate(request.id)}
                      disabled={acceptRequestMutation.isPending}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectRequestMutation.mutate(request.id)}
                      disabled={rejectRequestMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((searchUser: any) => (
                  <div key={searchUser.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={searchUser?.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                          {searchUser?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{searchUser?.username || 'Unknown User'}</p>
                        {searchUser?.isVerified && (
                          <p className="text-sm text-blue-500">Verified</p>
                        )}
                      </div>
                    </div>
                    {searchUser.id !== user?.id && (
                      <Button
                        size="sm"
                        onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                        disabled={sendFriendRequestMutation.isPending}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add to Circle
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex space-x-3">
          <Link href="/chats" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700">
              <MessageCircle className="w-4 h-4 mr-2" />
              Messages
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}