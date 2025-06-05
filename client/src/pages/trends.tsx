import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Link as LinkIcon, MoreVertical, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CommentModal } from "@/components/post/comment-modal";
import Auth from "@/pages/auth";

export default function Trends() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [videoMuteStates, setVideoMuteStates] = useState<Map<number, boolean>>(new Map());
  const [followingUsers, setFollowingUsers] = useState(new Set<number>());
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState<number | null>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const tapTimeouts = useRef<Map<number, number>>(new Map());
  const videoObserver = useRef<IntersectionObserver | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", "videos"],
    queryFn: async () => {
      // Get only video posts from users (not admin posts)
      const response = await fetch("/api/posts?adminOnly=false", {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch trends');
      const allPosts = await response.json();
      // Filter only video posts
      return allPosts.filter((post: any) => post.videoUrl);
    },
  });

  // Fetch user's following list to maintain persistent follow state
  const { data: followingList = [] } = useQuery({
    queryKey: ["/api/user/following"],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) return [];
      const response = await fetch(`/api/users/${user.id}/following`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAuthenticated && !!user?.id
  });

  // Update following state when data is fetched
  useEffect(() => {
    if (followingList.length > 0) {
      const followingIds = new Set<number>(followingList.map((user: any) => Number(user.id)));
      setFollowingUsers(followingIds);
    }
  }, [followingList]);

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error('Failed to like post');
      return response.json();
    },
    onSuccess: (data, postId) => {
      // Update post in cache with new like count
      queryClient.setQueryData(["/api/posts", "videos"], (oldPosts: any[]) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.map(p => 
          p.id === postId 
            ? { ...p, likesCount: data.likesCount, isLiked: data.liked }
            : p
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  // Setup intersection observer for video autoplay with optimized performance
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    videoObserver.current = new IntersectionObserver(
      (entries) => {
        // Debounce observer callbacks for better performance
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          entries.forEach((entry) => {
            const postId = parseInt(entry.target.getAttribute('data-post-id') || '0');
            const video = videoRefs.current.get(postId);
            
            if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
              // Video is clearly visible - play it immediately
              if (video && currentPlayingVideo !== postId) {
                // Pause all other videos first
                videoRefs.current.forEach((v, id) => {
                  if (v && id !== postId) {
                    v.pause();
                  }
                });
                
                setCurrentPlayingVideo(postId);
                video.currentTime = 0; // Start from beginning
                video.play().catch(() => {
                  // If autoplay fails, try with muted first
                  video.muted = true;
                  video.play().catch(console.error);
                });
              }
            } else if (entry.intersectionRatio < 0.2) {
              // Video is mostly out of view - pause it
              if (video && currentPlayingVideo === postId) {
                video.pause();
                setCurrentPlayingVideo(null);
              }
            }
          });
        }, 100); // Debounce by 100ms
      },
      {
        threshold: [0.2, 0.7],
        rootMargin: '-10px'
      }
    );

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (videoObserver.current) {
        videoObserver.current.disconnect();
      }
      // Clean up video refs and timeouts
      tapTimeouts.current.forEach(timeout => clearTimeout(timeout));
      tapTimeouts.current.clear();
    };
  }, [currentPlayingVideo]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Pause all videos and reset on unmount
      videoRefs.current.forEach(video => {
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });
      videoRefs.current.clear();
      tapTimeouts.current.forEach(timeout => clearTimeout(timeout));
      tapTimeouts.current.clear();
    };
  }, []);

  // Enhanced tap detection system for reliable single/double tap
  const handleVideoTap = (postId: number, event: React.MouseEvent) => {
    if (!isAuthenticated) {
      toast({
        title: "Please login",
        description: "You need to login to interact with videos",
        variant: "destructive"
      });
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const now = Date.now();
    const lastTap = tapTimeouts.current.get(postId);
    
    if (lastTap && (now - lastTap) < 300) {
      // Double tap detected - like the video
      tapTimeouts.current.delete(postId);
      likeMutation.mutate(postId);
      
      // Visual feedback for double tap
      const target = event.currentTarget as HTMLElement;
      target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        target.style.transform = 'scale(1)';
      }, 150);
    } else {
      // Potential single tap - wait for double tap timeout
      tapTimeouts.current.set(postId, now);
      setTimeout(() => {
        const currentTap = tapTimeouts.current.get(postId);
        if (currentTap === now) {
          // Single tap confirmed - toggle mute
          tapTimeouts.current.delete(postId);
          toggleVideoMute(postId);
        }
      }, 300);
    }
  };

  const toggleVideoMute = (postId: number) => {
    const video = videoRefs.current.get(postId);
    if (video) {
      const currentMute = videoMuteStates.get(postId) ?? false;
      const newMute = !currentMute;
      video.muted = newMute;
      setVideoMuteStates(prev => new Map(prev.set(postId, newMute)));
      
      // Visual feedback for mute toggle
      toast({
        title: newMute ? "Video muted" : "Video unmuted",
        duration: 1000
      });
    }
  };

  const followMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'follow' | 'unfollow' }) => {
      const response = await fetch(`/api/users/${userId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error('Failed to follow/unfollow user');
      return response.json();
    },
    onSuccess: (data, variables) => {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        if (variables.action === 'follow') {
          newSet.add(variables.userId);
        } else {
          newSet.delete(variables.userId);
        }
        return newSet;
      });
      // Invalidate both posts and following list to ensure persistent state
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
    },
  });

  const handleComment = (postId: number) => {
    setSelectedPostId(postId);
    setCommentModalOpen(true);
  };

  const handleFollow = (userId: number) => {
    const isFollowing = followingUsers.has(userId);
    followMutation.mutate({
      userId,
      action: isFollowing ? 'unfollow' : 'follow'
    });
    
    // Update local state immediately for better UX
    setFollowingUsers(prev => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4">
        <h1 className="text-white text-xl font-bold">Trends</h1>
      </div>
      
      {/* Video Feed */}
      <div className="h-screen overflow-y-auto snap-y snap-mandatory scrollbar-hide">
        {isLoading ? (
          <div className="h-screen flex items-center justify-center">
            <div className="text-white">Loading trends...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="h-screen flex items-center justify-center text-center px-4">
            <div>
              <h3 className="text-white text-lg font-semibold mb-2">No video trends yet</h3>
              <p className="text-gray-400">Be the first to upload a video trend!</p>
            </div>
          </div>
        ) : (
          posts.map((post: any, index: number) => (
            <div 
              key={post.id} 
              className="relative h-screen snap-start overflow-hidden"
              data-post-id={post.id}
              ref={(el) => {
                if (el && videoObserver.current) {
                  videoObserver.current.observe(el);
                }
              }}
            >
              {/* Video Background with tap controls */}
              <video
                ref={(el) => {
                  if (el) {
                    videoRefs.current.set(post.id, el);
                    // Set initial mute state to false (unmuted) for trends section
                    if (!videoMuteStates.has(post.id)) {
                      el.muted = false;
                      setVideoMuteStates(prev => new Map(prev.set(post.id, false)));
                    }
                  }
                }}
                src={post.videoUrl}
                className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                muted={videoMuteStates.get(post.id) ?? false}
                loop
                playsInline
                preload="metadata"
                onClick={() => handleVideoTap(post.id)}
              />
              
              {/* Audio indicator */}
              <div className="absolute top-4 right-4 z-50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 p-0"
                  onClick={() => handleVideoTap(post.id)}
                >
                  {videoMuteStates.get(post.id) ?? false ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              
              {/* Right Side Actions */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-6">
                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                    onClick={() => likeMutation.mutate(post.id)}
                  >
                    <Heart className={`w-7 h-7 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <span className="text-white text-xs font-semibold mt-1">
                    {post.likesCount > 999 
                      ? `${(post.likesCount / 1000).toFixed(1)}k` 
                      : post.likesCount || 0
                    }
                  </span>
                </div>
                
                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                    onClick={() => handleComment(post.id)}
                  >
                    <MessageCircle className="w-7 h-7" />
                  </Button>
                  <span className="text-white text-xs font-semibold mt-1">
                    {post.commentsCount > 999 
                      ? `${(post.commentsCount / 1000).toFixed(1)}k` 
                      : post.commentsCount || 0
                    }
                  </span>
                </div>
                
                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                  >
                    <Share className="w-6 h-6" />
                  </Button>
                </div>
                
                {/* Link Button (if link exists) */}
                {post.link && (
                  <div className="flex flex-col items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                      onClick={() => window.open(post.link, '_blank')}
                    >
                      <LinkIcon className="w-6 h-6" />
                    </Button>
                  </div>
                )}
                
                {/* More Options */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                  >
                    <MoreVertical className="w-6 h-6" />
                  </Button>
                </div>
              </div>
              
              {/* Bottom Content */}
              <div className="absolute bottom-4 left-4 right-20">
                {/* Username, Avatar and Follow Button */}
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="w-8 h-8 ring-2 ring-white">
                    <AvatarImage src={post.user.avatar} alt={post.user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs">
                      {post.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white font-bold text-base">{post.user.username}</span>
                  <Button 
                    className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                      followingUsers.has(post.user.id) 
                        ? 'bg-gray-600 border-gray-600 text-white hover:bg-gray-700' 
                        : 'bg-transparent border-white text-white hover:bg-white hover:text-black'
                    }`}
                    onClick={() => handleFollow(post.user.id)}
                  >
                    {followingUsers.has(post.user.id) ? 'Following' : 'Follow'}
                  </Button>
                </div>
                
                {/* Caption */}
                <p className="text-white text-sm mb-2 line-clamp-2">{post.caption}</p>
                
                {/* Link indicator */}
                {post.link && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                      <LinkIcon className="w-3 h-3 text-black" />
                    </div>
                    <span className="text-white text-xs">Link attached</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Navigation />
      
      {/* Comment Modal */}
      {selectedPostId && (
        <CommentModal 
          isOpen={commentModalOpen}
          onClose={() => {
            setCommentModalOpen(false);
            setSelectedPostId(null);
          }}
          postId={selectedPostId}
          currentUser={user}
        />
      )}
    </div>
  );
}