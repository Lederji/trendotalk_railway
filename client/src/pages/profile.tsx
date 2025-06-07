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
import { Navigation } from "@/components/layout/navigation";
import { Settings, Grid, Heart, MessageCircle, Share, Edit, Camera, Users, UserPlus, UserMinus, FileText, Menu, TrendingUp } from "lucide-react";
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
    displayName: '',
    avatar: '',
    links: [] as { name: string; url: string }[]
  });
  const [uploading, setUploading] = useState(false);

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
    onSuccess: (updatedUser) => {
      // Update both profile queries with new data
      queryClient.setQueryData([`/api/users/${currentUser?.id}`], updatedUser);
      queryClient.setQueryData(['/api/me'], updatedUser);
      
      // Also invalidate to ensure fresh data on next load
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setEditForm({ ...editForm, avatar: result.url });
      
      // Update the profile immediately with new avatar
      queryClient.setQueryData([`/api/users/${currentUser?.id}`], (oldData: any) => ({
        ...oldData,
        avatar: result.url
      }));
      
      toast({
        title: "Image uploaded",
        description: "Profile picture uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      let links = [];
      try {
        links = profile.links ? JSON.parse(profile.links) : [];
      } catch (e) {
        links = [];
      }
      
      setEditForm({
        bio: profile.bio || '',
        displayName: profile.displayName || '',
        avatar: profile.avatar || '',
        links: links
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
        <div className="flex items-center">
          <h1 className="font-semibold text-lg text-left">{profile?.username}</h1>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <Menu className="w-5 h-5" />
        </Button>
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
          <div className="mb-2">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="font-semibold text-base">{profile?.displayName || profile?.username}</h2>
              
              {/* Platform Links */}
              <div className="flex gap-2">
                {(() => {
                  try {
                    const links = profile?.links ? JSON.parse(profile.links) : [];
                    return links.slice(0, 2).map((link: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          const url = link.url.startsWith('http') ? link.url : `https://${link.url}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        {link.name}
                      </button>
                    ));
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            </div>
          </div>
          
          {profile?.bio && (
            <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{profile.bio}</p>
          )}
          

        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          {isOwnProfile ? (
            <>
              <Button
                variant="outline"
                className="flex-1 text-xs px-1 py-2 min-w-0"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="w-3 h-3 mr-1" />
                <span className="truncate">Edit</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-xs px-1 py-2 min-w-0"
              >
                <FileText className="w-3 h-3 mr-1" />
                <span className="truncate">CV</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-xs px-1 py-2 min-w-0"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                <span className="truncate">Performance</span>
              </Button>
            </>
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
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profile Picture
              </label>
              <div className="space-y-3">
                {/* Current Profile Picture Display */}
                {editForm.avatar && (
                  <div className="flex items-center space-x-3">
                    <img src={editForm.avatar} alt="Current profile" className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Current profile picture</p>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, avatar: '' })}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove picture
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Upload New Picture */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={uploading}
                  />
                  {uploading && <p className="text-sm text-blue-600">Uploading new picture...</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio ({editForm.bio.length}/150) - spaces count
              </label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => {
                  const text = e.target.value;
                  // Count all characters including spaces, but handle special keys
                  if (text.length <= 150) {
                    setEditForm({ ...editForm, bio: text });
                  }
                }}
                onKeyDown={(e) => {
                  // Allow navigation keys without counting them as characters
                  const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Shift', 'Control', 'Alt', 'Meta'];
                  if (allowedKeys.includes(e.key)) {
                    return;
                  }
                  
                  // Prevent input if at character limit and not deleting
                  if (editForm.bio.length >= 150 && e.key !== 'Backspace' && e.key !== 'Delete') {
                    e.preventDefault();
                  }
                }}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={150}
                className={editForm.bio.length > 140 ? "border-orange-400" : ""}
              />
              {editForm.bio.length > 140 && (
                <p className="text-sm text-orange-600 mt-1">
                  {150 - editForm.bio.length} characters remaining
                </p>
              )}
            </div>
            {/* Platform Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Links
              </label>
              
              {/* Existing Links */}
              {editForm.links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Platform name (e.g., YouTube)"
                    value={link.name}
                    onChange={(e) => {
                      const newLinks = [...editForm.links];
                      newLinks[index] = { ...link, name: e.target.value };
                      setEditForm({ ...editForm, links: newLinks });
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="https://example.com"
                    value={link.url}
                    onChange={(e) => {
                      const newLinks = [...editForm.links];
                      newLinks[index] = { ...link, url: e.target.value };
                      setEditForm({ ...editForm, links: newLinks });
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newLinks = editForm.links.filter((_, i) => i !== index);
                      setEditForm({ ...editForm, links: newLinks });
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
              
              {/* Add New Link Button */}
              {editForm.links.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditForm({
                      ...editForm,
                      links: [...editForm.links, { name: '', url: '' }]
                    });
                  }}
                  className="w-full"
                >
                  + Add Platform Link
                </Button>
              )}
              
              {editForm.links.length >= 2 && (
                <p className="text-sm text-gray-500">Maximum 2 links allowed</p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                const formData = {
                  bio: editForm.bio,
                  displayName: editForm.displayName,
                  avatar: editForm.avatar,
                  links: JSON.stringify(editForm.links.filter(link => link.name && link.url))
                };
                updateProfileMutation.mutate(formData);
              }}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}