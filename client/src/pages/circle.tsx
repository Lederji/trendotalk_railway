import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Check, X, Users, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface User {
  id: number;
  username: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Story {
  id: number;
  userId: number;
  imageUrl?: string;
  videoUrl?: string;
  expiresAt: string;
}

interface StoryWithUser extends Story {
  user: User;
}

interface FriendRequest {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: string;
  createdAt: string;
  fromUser: User;
}

export default function Circle() {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadType, setUploadType] = useState<"image" | "video">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stories = [] } = useQuery({
    queryKey: ["/api/stories/circle"],
    refetchInterval: 30000,
  });

  const { data: userStories = [] } = useQuery({
    queryKey: ["/api/stories/user"],
    refetchInterval: 30000,
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 5000,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/users/search", searchQuery],
    enabled: searchQuery.length > 0,
  });

  // Type cast the data
  const typedFriendRequests = (friendRequests as FriendRequest[]) || [];
  const typedUserStories = (userStories as Story[]) || [];
  const typedSearchResults = (searchResults as User[]) || [];
  const typedStories = (stories as StoryWithUser[]) || [];

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

  const uploadStoryMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);

      const response = await fetch("/api/stories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload story");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Story uploaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stories/circle"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload story",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if ((uploadType === "image" && !isImage) || (uploadType === "video" && !isVideo)) {
        toast({
          title: "Invalid file type",
          description: `Please select a ${uploadType} file`,
          variant: "destructive",
        });
        return;
      }

      uploadStoryMutation.mutate(file);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Circle</h1>
          <p className="text-white/80">Connect with friends and share your moments</p>
        </div>

        {/* Friend Requests */}
        {typedFriendRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Friend Requests ({typedFriendRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {typedFriendRequests.map((request: FriendRequest) => (
                <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.fromUser?.avatar} alt={request.fromUser?.username || 'User'} />
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

        {/* Add Story */}
        <Card>
          <CardHeader>
            <CardTitle>Add to Your Circle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant={uploadType === "image" ? "default" : "outline"}
                onClick={() => setUploadType("image")}
                className="flex-1"
              >
                Image
              </Button>
              <Button
                variant={uploadType === "video" ? "default" : "outline"}
                onClick={() => setUploadType("video")}
                className="flex-1"
              >
                Video
              </Button>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStoryMutation.isPending}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {uploadStoryMutation.isPending ? "Uploading..." : `Upload ${uploadType}`}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={uploadType === "image" ? "image/*" : "video/*"}
              onChange={handleFileUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Your Stories */}
        {typedUserStories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Your Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {typedUserStories.map((story: Story) => (
                  <div key={story.id} className="relative aspect-square rounded-lg overflow-hidden">
                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt="Your story"
                        className="w-full h-full object-cover"
                      />
                    ) : story.videoUrl ? (
                      <video
                        src={story.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <span className="text-white text-sm">Story</span>
                      </div>
                    )}
                    {isExpired(story.expiresAt) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs">Expired</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
            {typedSearchResults.length > 0 && (
              <div className="space-y-2">
                {typedSearchResults.map((searchUser: User) => (
                  <div key={searchUser.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={searchUser?.avatar} alt={searchUser?.username || 'User'} />
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
                        Add to Circle
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Circle Stories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Circle Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typedStories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No stories from your circle yet</p>
                <p className="text-sm mt-2">Connect with friends to see their stories here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {typedStories.map((story: StoryWithUser) => (
                  <div key={story.id} className="relative aspect-square rounded-lg overflow-hidden">
                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt={`${story.user.username}'s story`}
                        className="w-full h-full object-cover"
                      />
                    ) : story.videoUrl ? (
                      <video
                        src={story.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <span className="text-white text-sm">Story</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-sm font-medium">{story.user.username}</p>
                    </div>
                    {isExpired(story.expiresAt) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs">Expired</span>
                      </div>
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