import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, UserPlus, MessageCircle, Users, Heart, Play, Grid3X3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/layout/navigation";

export default function Profile() {
  const params = useParams();
  const username = params.username;
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileUser, isLoading } = useQuery({
    queryKey: ["/api/users/profile", username],
    queryFn: async () => {
      const response = await fetch(`/api/users/profile/${username}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!username,
  });

  const { data: userVibes = [] } = useQuery({
    queryKey: ["/api/vibes/user", profileUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/vibes/user/${profileUser.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!profileUser?.id,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch("/api/friend-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
        body: JSON.stringify({ friendId: userId }),
      });
      if (!response.ok) throw new Error("Failed to send friend request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent!",
        description: `Your friend request has been sent to ${profileUser?.username}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">User not found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The user you're looking for doesn't exist.</p>
            <Link href="/circle">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Circle
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;
  const activeVibes = userVibes.filter((vibe: any) => {
    const vibeTime = new Date(vibe.createdAt).getTime();
    const now = Date.now();
    return now - vibeTime < 24 * 60 * 60 * 1000; // 24 hours
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/circle">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Circle
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <Card className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-pink-200 dark:border-gray-700">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-32 h-32 border-4 border-pink-200 dark:border-pink-700">
                <AvatarImage src={profileUser.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-bold text-3xl">
                  {profileUser.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {profileUser.username}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {profileUser.bio || "No bio available"}
                </p>
                
                <div className="flex justify-center md:justify-start gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {activeVibes.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Vibes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {profileUser.followersCount || 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {profileUser.followingCount || 0}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
                  </div>
                </div>

                {!isOwnProfile && (
                  <div className="flex justify-center md:justify-start gap-3">
                    <Button
                      onClick={() => sendFriendRequestMutation.mutate(profileUser.id)}
                      disabled={sendFriendRequestMutation.isPending}
                      className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 text-white font-semibold"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add to Circle
                    </Button>
                    <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="vibes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="vibes" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Vibes ({activeVibes.length})
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vibes" className="mt-6">
            {activeVibes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeVibes.map((vibe: any) => (
                  <Card key={vibe.id} className="aspect-square bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-pink-200 dark:border-gray-700 overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-0 relative h-full">
                      {vibe.videoUrl ? (
                        <video
                          src={vibe.videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : vibe.imageUrl ? (
                        <img
                          src={vibe.imageUrl}
                          alt="Vibe"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-800 dark:to-purple-800 flex items-center justify-center">
                          <Heart className="w-8 h-8 text-pink-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  No active vibes
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  {isOwnProfile ? "Share your first vibe!" : `${profileUser.username} hasn't shared any vibes recently`}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <div className="text-center py-12">
              <Grid3X3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Posts feature coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-pink-200 dark:border-gray-700">
              <CardHeader>
                <h3 className="text-xl font-semibold">About {profileUser.username}</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Bio</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {profileUser.bio || "No bio available"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Joined</h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(profileUser.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                          {activeVibes.length}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Active Vibes</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {userVibes.length}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Vibes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}