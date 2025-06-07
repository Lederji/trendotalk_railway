import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navigation } from "@/components/layout/navigation";
import { Settings, Grid, Heart, MessageCircle, Share, Edit, Camera, Users, UserPlus, UserMinus, FileText, Menu, TrendingUp, User, Clock, HelpCircle, Info, LogOut, MessageSquare, CheckCircle, AtSign, Megaphone, Send } from "lucide-react";
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
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [serviceForm, setServiceForm] = useState({
    verifiedTickReason: '',
    customUsername: '',
    adBudget: '',
    adDescription: '',
    contactInfo: ''
  });

  const profileUserId = userId ? parseInt(userId) : currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  // Fetch user profile data - fallback to current user if profile not found
  const { data: profile, isLoading } = useQuery({
    queryKey: [`/api/users/${profileUserId}`],
    enabled: !!profileUserId,
    retry: false,
  }) as { data: any, isLoading: boolean };

  // If profile not found but viewing own profile, use current user data
  const displayProfile = profile || (isOwnProfile ? currentUser : null);

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

  // Fetch followers list
  const { data: followers = [] } = useQuery({
    queryKey: [`/api/users/${profileUserId}/followers`],
    enabled: !!profileUserId && showFollowersList,
  }) as { data: any[] };

  // Fetch following list
  const { data: following = [] } = useQuery({
    queryKey: [`/api/users/${profileUserId}/following-list`],
    enabled: !!profileUserId && showFollowingList,
  }) as { data: any[] };

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
          <h1 className="font-semibold text-lg text-left">{displayProfile?.username}</h1>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => {
              console.log('Account Center clicked from profile');
              setLocation('/account-center');
            }}>
              <User className="mr-2 h-4 w-4" />
              <span>Account Center</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {/* Time Management */}}>
              <Clock className="mr-2 h-4 w-4" />
              <span>Time Management</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowServiceRequest(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Service Request</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {/* Help and Support */}}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help and Support</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {/* About */}}>
              <Info className="mr-2 h-4 w-4" />
              <span>About</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                localStorage.removeItem('sessionId');
                setLocation('/login');
              }}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Header */}
      <div className="p-4">
        <div className="flex items-start space-x-4 mb-4">
          {/* Profile Picture */}
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={displayProfile?.avatar} alt={displayProfile?.username} />
              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl">
                {displayProfile?.username?.[0]?.toUpperCase() || 'U'}
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
              <button
                onClick={() => setShowFollowersList(true)}
                className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="font-semibold text-lg">{displayProfile?.followersCount || 0}</div>
                <div className="text-gray-500 text-sm">Followers</div>
              </button>
              <button
                onClick={() => setShowFollowingList(true)}
                className="hover:bg-gray-50 rounded-lg p-2 transition-colors"
              >
                <div className="font-semibold text-lg">{displayProfile?.followingCount || 0}</div>
                <div className="text-gray-500 text-sm">Following</div>
              </button>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-4">
          <div className="mb-2">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="font-semibold text-base">{displayProfile?.displayName || displayProfile?.username}</h2>
              
              {/* Platform Links */}
              <div className="flex gap-2">
                {(() => {
                  try {
                    const links = displayProfile?.links ? JSON.parse(displayProfile.links) : [];
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
          
          {displayProfile?.bio && (
            <p className="text-gray-700 text-sm mt-1 whitespace-pre-wrap">{displayProfile.bio}</p>
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
            {posts
              .sort((a: any, b: any) => {
                // Sort logic: top 3 most viewed videos first, then by date
                const aIsVideo = !!(a.video1Url || a.video2Url || a.video3Url || a.videoUrl);
                const bIsVideo = !!(b.video1Url || b.video2Url || b.video3Url || b.videoUrl);
                
                if (aIsVideo && bIsVideo) {
                  return (b.viewsCount || 0) - (a.viewsCount || 0);
                }
                
                if (aIsVideo && !bIsVideo) return -1;
                if (!aIsVideo && bIsVideo) return 1;
                
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .map((post: any) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 relative cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => setLocation(`/post/${post.id}`)}
                >
                  {post.video1Url || post.video2Url || post.video3Url || post.videoUrl ? (
                    <video
                      src={post.video1Url || post.video2Url || post.video3Url || post.videoUrl}
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
      
      {/* Followers List Dialog */}
      <Dialog open={showFollowersList} onOpenChange={setShowFollowersList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {followers.map((follower: any) => (
              <div key={follower.id} className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={follower.avatar} alt={follower.username} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                    {follower.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{follower.username}</p>
                  {follower.displayName && (
                    <p className="text-gray-500 text-xs">{follower.displayName}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/profile/${follower.id}`)}
                >
                  View
                </Button>
              </div>
            ))}
            {followers.length === 0 && (
              <p className="text-center text-gray-500 py-8">No followers yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following List Dialog */}
      <Dialog open={showFollowingList} onOpenChange={setShowFollowingList}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {following.map((followingUser: any) => (
              <div key={followingUser.id} className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={followingUser.avatar} alt={followingUser.username} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                    {followingUser.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{followingUser.username}</p>
                  {followingUser.displayName && (
                    <p className="text-gray-500 text-xs">{followingUser.displayName}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation(`/profile/${followingUser.id}`)}
                >
                  View
                </Button>
              </div>
            ))}
            {following.length === 0 && (
              <p className="text-center text-gray-500 py-8">Not following anyone yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Request Dialog */}
      <Dialog open={showServiceRequest} onOpenChange={setShowServiceRequest}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Service Request
            </DialogTitle>
          </DialogHeader>
          
          {!selectedService ? (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">Select a service you'd like to request:</p>
              
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="justify-start h-auto p-4 text-left"
                  onClick={() => setSelectedService('verified')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="font-semibold">Apply for Verified Tick</div>
                      <div className="text-sm text-gray-500">Get the blue verified badge for your account</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start h-auto p-4 text-left"
                  onClick={() => setSelectedService('username')}
                >
                  <div className="flex items-center gap-3">
                    <AtSign className="w-6 h-6 text-purple-500" />
                    <div>
                      <div className="font-semibold">Get Custom Username</div>
                      <div className="text-sm text-gray-500">Request a custom or premium username</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start h-auto p-4 text-left"
                  onClick={() => setSelectedService('ads')}
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-green-500" />
                    <div>
                      <div className="font-semibold">Run TrendoTalk Ads</div>
                      <div className="text-sm text-gray-500">Promote your content with sponsored posts</div>
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedService === 'verified' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-blue-700">Verified Tick Application</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason for Verification</label>
                    <Textarea
                      placeholder="Please explain why you should be verified (e.g., public figure, brand, content creator, etc.)"
                      value={serviceForm.verifiedTickReason}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, verifiedTickReason: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Information</label>
                    <Input
                      placeholder="Email or phone for follow-up"
                      value={serviceForm.contactInfo}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              {selectedService === 'username' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                    <AtSign className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-purple-700">Custom Username Request</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Desired Username</label>
                    <Input
                      placeholder="@your_desired_username"
                      value={serviceForm.customUsername}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, customUsername: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason for Request</label>
                    <Textarea
                      placeholder="Why do you need this specific username?"
                      value={serviceForm.verifiedTickReason}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, verifiedTickReason: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Information</label>
                    <Input
                      placeholder="Email or phone for follow-up"
                      value={serviceForm.contactInfo}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              {selectedService === 'ads' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <Megaphone className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-700">TrendoTalk Ads Campaign</span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Campaign Budget</label>
                    <Input
                      placeholder="e.g., $50, $100, $500"
                      value={serviceForm.adBudget}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, adBudget: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Ad Campaign Description</label>
                    <Textarea
                      placeholder="Describe what you want to promote and your target audience"
                      value={serviceForm.adDescription}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, adDescription: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Information</label>
                    <Input
                      placeholder="Email or phone for campaign coordination"
                      value={serviceForm.contactInfo}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedService('');
                    setServiceForm({
                      verifiedTickReason: '',
                      customUsername: '',
                      adBudget: '',
                      adDescription: '',
                      contactInfo: ''
                    });
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    toast({
                      title: "Service Request Submitted",
                      description: "Your request has been submitted. We'll contact you within 24-48 hours.",
                    });
                    setShowServiceRequest(false);
                    setSelectedService('');
                    setServiceForm({
                      verifiedTickReason: '',
                      customUsername: '',
                      adBudget: '',
                      adDescription: '',
                      contactInfo: ''
                    });
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}