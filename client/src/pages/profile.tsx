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
      
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar className="w-24 h-24 md:w-32 md:h-32">
                  <AvatarImage src={profileData.avatar} alt={profileData.username} />
                  <AvatarFallback className="text-2xl">
                    {profileData.username[3]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                  <h1 className="text-2xl font-bold flex items-center justify-center md:justify-start gap-2">
                    {profileData.username}
                    {profileData.isAdmin && (
                      <Badge variant="secondary" className="gradient-bg text-white">
                        <i className="fas fa-check-circle mr-1"></i>
                        Admin
                      </Badge>
                    )}
                  </h1>
                  
                  {isOwnProfile ? (
                    <div className="flex gap-2 justify-center md:justify-start mt-2 md:mt-0">
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" size="sm" onClick={logout}>
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center md:justify-start mt-2 md:mt-0">
                      <Button size="sm" className="gradient-bg text-white hover:opacity-90">
                        {profileData.isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex justify-center md:justify-start space-x-8 mb-4">
                  <div className="text-center">
                    <span className="font-bold text-lg">{profileData.posts?.length || 0}</span>
                    <p className="text-gray-600 text-sm">Posts</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg">{profileData.followersCount}</span>
                    <p className="text-gray-600 text-sm">Followers</p>
                  </div>
                  <div className="text-center">
                    <span className="font-bold text-lg">{profileData.followingCount}</span>
                    <p className="text-gray-600 text-sm">Following</p>
                  </div>
                </div>

                {/* Bio */}
                {profileData.bio && (
                  <p className="text-gray-700">{profileData.bio}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-center border-b border-gray-200">
            <Button variant="ghost" className="flex items-center gap-2 border-b-2 border-gray-800 rounded-none pb-2">
              <Grid className="h-4 w-4" />
              Posts
            </Button>
          </div>

          {profileData.posts && profileData.posts.length > 0 ? (
            <div className="space-y-6">
              {profileData.posts.map((post: any) => (
                <PostCard key={post.id} post={{...post, user: profileData}} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Grid className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No posts yet</h3>
                <p className="text-gray-500">
                  {isOwnProfile 
                    ? "Share your first trend to get started!" 
                    : `${profileData.username} hasn't posted anything yet.`
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}
