import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Grid, Heart, MessageCircle, Users } from "lucide-react";
import Auth from "./auth";

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated, logout } = useAuth();
  
  // If no username provided, show current user's profile
  const targetUsername = username || currentUser?.username;
  const isOwnProfile = !username || username === currentUser?.username;

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["/api/users", targetUsername],
    queryFn: async () => {
      const response = await fetch(`/api/users/${targetUsername}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch profile');
      return response.json();
    },
    enabled: !!targetUsername,
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 text-center">
                  <div className="w-32 h-6 bg-gray-200 rounded mx-auto"></div>
                  <div className="w-48 h-4 bg-gray-200 rounded mx-auto"></div>
                </div>
                <div className="flex space-x-8">
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">User not found</h3>
              <p className="text-gray-500">The user you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 py-4 pb-20">
        {/* Profile Header */}
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-4 mb-4">
            {/* Avatar */}
            <Avatar className="w-20 h-20">
              <AvatarImage src={profileData.avatar} alt={profileData.username} />
              <AvatarFallback className="text-xl">
                {profileData.username[3]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  {profileData.username}
                  {profileData.isAdmin && (
                    <Badge variant="secondary" className="gradient-bg text-white text-xs">
                      Admin
                    </Badge>
                  )}
                </h1>
                
                {isOwnProfile ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs px-3">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={logout} className="text-xs px-3">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="gradient-bg text-white hover:opacity-90 text-xs px-4">
                      {profileData.isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs px-3">
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex space-x-6 mb-3">
                <div className="text-center">
                  <div className="font-semibold text-sm">{profileData.posts?.length || 0}</div>
                  <div className="text-xs text-gray-500">posts</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{profileData.followersCount}</div>
                  <div className="text-xs text-gray-500">followers</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{profileData.followingCount}</div>
                  <div className="text-xs text-gray-500">following</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profileData.bio && (
            <p className="text-sm text-gray-700">{profileData.bio}</p>
          )}
        </div>

        {/* Posts Grid */}
        <div className="border-t border-gray-200 bg-white">
          <div className="flex items-center justify-center py-3 border-b border-gray-200">
            <Button variant="ghost" className="flex items-center gap-2 border-b-2 border-gray-800 rounded-none pb-1">
              <Grid className="h-4 w-4" />
              <span className="text-sm font-medium">Posts</span>
            </Button>
          </div>

          {profileData.posts && profileData.posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {profileData.posts.map((post: any) => (
                <div key={post.id} className="aspect-square relative group cursor-pointer overflow-hidden">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  ) : post.videoUrl ? (
                    <video
                      src={post.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No media</span>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                    <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center space-x-3">
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        <span className="font-semibold text-sm">{post.likesCount}</span>
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        <span className="font-semibold text-sm">{post.commentsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Grid className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts yet</h3>
              <p className="text-gray-500 text-sm">
                {isOwnProfile 
                  ? "Share your first trend to get started!" 
                  : `${profileData.username} hasn't posted anything yet.`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
