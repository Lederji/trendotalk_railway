import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Settings, Grid, Heart, MessageCircle, Share, Edit, Camera, Users, UserPlus, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    username: '',
    avatar: ''
  });

  const profileUserId = userId ? parseInt(userId) : currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId,
  }) as { data: any, isLoading: boolean };

  // Fetch user posts
  const { data: posts = [] } = useQuery({
    queryKey: [`/api/users/${profileUserId}/posts`],
    enabled: !!profileUserId,
  }) as { data: any[] };

  // Check if following
  const { data: isFollowing } = useQuery({
    queryKey: [`/api/users/${profileUserId}/following`],
    enabled: !!profileUserId && !isOwnProfile,
  }) as { data: boolean };

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      const action = isFollowing ? 'unfollow' : 'follow';
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`/api/users/${profileUserId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to follow/unfollow');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}/following`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${profileUserId}`] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: `You ${isFollowing ? 'unfollowed' : 'are now following'} ${profile?.username}`,
      });
    },
  });

  // Send friend request mutation
  const friendRequestMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch('/api/friend-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ toUserId: profileUserId }),
      });
      if (!response.ok) throw new Error('Failed to send friend request');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: `Friend request sent to ${profile?.username}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const sessionId = localStorage.getItem('sessionId');
      const response = await fetch(`/api/users/${currentUser?.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}`] });
      setShowEditDialog(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        bio: profile.bio || '',
        username: profile.username || '',
        avatar: profile.avatar || ''
      });
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">{profile?.username}</h1>
        </div>
        
        {isOwnProfile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEditDialog(true)}
            className="rounded-full"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Profile Header */}
      <div className="p-4">
        <div className="flex items-start space-x-4 mb-4">
          {/* Profile Picture */}
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar} alt={profile?.username} />
              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <Button
                size="icon"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600"
              >
                <Camera className="w-3 h-3 text-white" />
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex justify-around text-center">
              <div>
                <div className="font-semibold text-lg">{posts?.length || 0}</div>
                <div className="text-gray-500 text-sm">Posts</div>
              </div>
              <div>
                <div className="font-semibold text-lg">{profile?.followersCount || 0}</div>
                <div className="text-gray-500 text-sm">Followers</div>
              </div>
              <div>
                <div className="font-semibold text-lg">{profile?.followingCount || 0}</div>
                <div className="text-gray-500 text-sm">Following</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <h2 className="font-semibold text-base">{profile?.username}</h2>
          {profile?.bio && (
            <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{profile.bio}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {isOwnProfile ? (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button
                variant={isFollowing ? "outline" : "default"}
                className="flex-1"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => friendRequestMutation.mutate()}
                disabled={friendRequestMutation.isPending}
              >
                <Users className="w-4 h-4 mr-2" />
                Message
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="border-t border-gray-200">
        <div className="flex items-center justify-center py-3 border-b border-gray-200">
          <Grid className="w-5 h-5 text-gray-400" />
        </div>
        
        {posts && posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post: any) => (
              <div
                key={post.id}
                className="aspect-square bg-gray-100 relative cursor-pointer hover:opacity-75 transition-opacity"
                onClick={() => setLocation(`/post/${post.id}`)}
              >
                {post.video1Url || post.video2Url || post.video3Url ? (
                  <video
                    src={post.video1Url || post.video2Url || post.video3Url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs text-center p-2">
                      {post.title}
                    </span>
                  </div>
                )}
                
                {/* Overlay with stats */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="flex items-center space-x-4 text-white">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-5 h-5" />
                      <span className="font-semibold">{post.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-semibold">{post.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No Posts Yet</h3>
            <p className="text-gray-400">
              {isOwnProfile ? "Share your first post to get started!" : "This user hasn't shared any posts yet."}
            </p>
          </div>
        )}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avatar URL
              </label>
              <Input
                value={editForm.avatar}
                onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                placeholder="Enter avatar URL"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => updateProfileMutation.mutate(editForm)}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}