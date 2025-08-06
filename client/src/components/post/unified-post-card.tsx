import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageCircle, ExternalLink, ChevronDown, ChevronUp, Play, Pause, VolumeX, Volume2, Share2, Edit, Trash2 } from "lucide-react";
import { CachedImage } from "@/components/ui/cached-image";
import { CachedVideo } from "@/components/ui/cached-video";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CommentModal } from "./comment-modal";
import { EditPostModal } from "./edit-post-modal";

interface UnifiedPostCardProps {
  post: {
    id: number;
    title?: string;
    caption?: string;
    video1Url?: string;
    video2Url?: string;
    video3Url?: string;
    imageUrl?: string;
    videoUrl?: string;
    rank?: number;
    otherRank?: string;
    category?: string;
    type?: string;
    detailsLink?: string;
    link?: string;
    likesCount?: number;
    dislikesCount?: number;
    votesCount?: number;
    isAdminPost?: boolean;
    user: {
      username: string;
      avatar?: string;
      isAdmin?: boolean;
    };
  };
  currentUser?: {
    id: number;
    username: string;
    isAdmin: boolean;
  } | null;
  onVideoRefsReady?: (postId: number, videos: HTMLVideoElement[]) => void;
}

export function UnifiedPostCard({ post, currentUser, onVideoRefsReady }: UnifiedPostCardProps) {
  const [expandedContent, setExpandedContent] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Track interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isVoted, setIsVoted] = useState(false);
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const singleVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Collect video elements for autoplay system
  const collectVideoRefs = () => {
    const videos: HTMLVideoElement[] = [];
    if (isAdminVideoPost) {
      videoRefs.current.forEach(video => {
        if (video) videos.push(video);
      });
    } else if (singleVideoRef.current) {
      videos.push(singleVideoRef.current);
    }
    if (videos.length > 0 && onVideoRefsReady) {
      onVideoRefsReady(post.id, videos);
    }
  };

  // Determine if this is an admin video post or regular post
  const isAdminVideoPost = post.isAdminPost && (post.video1Url || post.video2Url || post.video3Url);
  const isRegularPost = !post.isAdminPost;
  
  // Initialize interaction states from post data
  useEffect(() => {
    setIsLiked((post as any).isLiked || false);
    setIsDisliked((post as any).isDisliked || false);
    setIsVoted((post as any).isVoted || false);
  }, [post]);

  // Auto-start videos when component mounts
  useEffect(() => {
    const startAutoplay = () => {
      if (isAdminVideoPost && videoRefs.current[0]) {
        // Auto-start first admin video muted
        const firstVideo = videoRefs.current[0];
        firstVideo.muted = true;
        firstVideo.play().catch(() => {
          // Autoplay failed, which is normal on some browsers
        });
        setActiveVideo(0);
        setIsPlaying(true);
      } else if (singleVideoRef.current) {
        // Auto-start regular video muted
        const video = singleVideoRef.current;
        video.muted = true;
        video.play().catch(() => {
          // Autoplay failed, which is normal on some browsers
        });
        setIsPlaying(true);
      }
    };
    
    // Small delay to ensure video elements are ready
    setTimeout(startAutoplay, 200);
  }, [isAdminVideoPost]);

  // For admin video posts
  const adminVideos = [post.video1Url, post.video2Url, post.video3Url].filter(Boolean);
  const videoCount = adminVideos.length;

  const handleAdminVideoClick = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;

    // Pause all other videos first
    videoRefs.current.forEach((v, i) => {
      if (v && i !== index) {
        v.pause();
        v.muted = true;
      }
    });

    if (activeVideo === index) {
      // If this video is already active, toggle mute/unmute
      video.muted = !video.muted;
      setIsMuted(video.muted);
    } else {
      // Play this video and unmute it
      video.muted = false;
      setIsMuted(false);
      video.play().catch(console.error);
      setActiveVideo(index);
      setIsPlaying(true);
    }
  };

  const handleRegularVideoClick = () => {
    const video = singleVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      if (isMuted) {
        video.muted = false;
        setIsMuted(false);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } else {
      video.muted = false;
      setIsMuted(false);
      video.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const getVideoLayout = () => {
    if (videoCount === 1) return "grid-cols-1";
    if (videoCount === 2) return "grid-cols-2 gap-1";
    if (videoCount === 3) return "grid-cols-3 gap-1";
    return "grid-cols-1";
  };

  const formatContent = (content: string) => {
    if (expandedContent || content.length <= 100) {
      return content;
    }
    return content.substring(0, 100) + "...";
  };

  const formatOtherRank = (otherRank?: string) => {
    if (!otherRank) return null;
    // Convert "on youtube:#1" to "#1 on youtube"
    const match = otherRank.match(/on\s+(\w+):#(\d+)/i);
    if (match) {
      const [, platform, rank] = match;
      return `#${rank} on ${platform}`;
    }
    return otherRank;
  };

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state immediately - like/dislike are mutually exclusive
      setIsLiked(data.liked);
      setIsDisliked(false); // Always remove dislike when liking
      
      // Update post in cache with new counts
      queryClient.setQueryData(["/api/posts"], (oldPosts: any[]) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.map(p => 
          p.id === post.id 
            ? { 
                ...p, 
                likesCount: data.likesCount, 
                dislikesCount: data.dislikesCount || 0, 
                isLiked: data.liked,
                isDisliked: false 
              }
            : p
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const dislikeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/dislike`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state immediately - like/dislike are mutually exclusive
      console.log('Dislike response:', data);
      setIsDisliked(data.disliked);
      setIsLiked(false); // Always remove like when disliking
      console.log('After dislike update:', { isDisliked: data.disliked, isLiked: false });
      
      // Update post in cache with new counts
      queryClient.setQueryData(["/api/posts"], (oldPosts: any[]) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.map(p => 
          p.id === post.id 
            ? { 
                ...p, 
                likesCount: data.likesCount || 0, 
                dislikesCount: data.dislikesCount, 
                isLiked: false,
                isDisliked: data.disliked 
              }
            : p
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/vote`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state immediately
      console.log('Vote response:', data);
      setIsVoted(data.voted);
      console.log('After vote update:', { isVoted: data.voted });
      
      // Update post in cache with new vote count
      queryClient.setQueryData(["/api/posts"], (oldPosts: any[]) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.map(p => 
          p.id === post.id 
            ? { ...p, votesCount: data.votesCount, isVoted: data.voted }
            : p
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const handleLike = () => {
    if (!currentUser) {
      alert('Please login to like posts');
      return;
    }
    likeMutation.mutate();
  };

  const handleDislike = () => {
    if (!currentUser) {
      alert('Please login to dislike posts');
      return;
    }
    console.log('Before dislike:', { isDisliked, isLiked });
    dislikeMutation.mutate();
  };

  const handleVote = () => {
    if (!currentUser) {
      // Redirect to login or show login modal
      alert('Please login to vote');
      return;
    }
    console.log('Before vote:', { isVoted });
    voteMutation.mutate();
  };

  const handleComment = () => {
    setCommentModalOpen(true);
  };

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      // Use admin delete endpoint if user is admin
      const endpoint = currentUser?.isAdmin ? `/api/admin/posts/${post.id}` : `/api/posts/${post.id}`;
      const response = await apiRequest("DELETE", endpoint);
      return response.json();
    },
    onSuccess: () => {
      // Remove post from cache immediately
      queryClient.setQueryData(["/api/posts"], (oldPosts: any[]) => {
        if (!oldPosts) return oldPosts;
        return oldPosts.filter(p => p.id !== post.id);
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    }
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      deletePostMutation.mutate();
    }
  };

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || post.caption || 'TrendoTalk Post',
          text: post.title || post.caption || 'Check out this post on TrendoTalk',
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      // You could show a toast here indicating the link was copied
    }
  };

  if (isAdminVideoPost) {
    return (
      <>
        <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <CardContent className="p-0">
            {/* Fixed 16:9 Video Container */}
            <div className="relative w-full aspect-video bg-black">
              <div className={cn("grid h-full", getVideoLayout())}>
                {adminVideos.map((videoUrl, index) => (
                  <div key={`video-${post.id}-${index}`} className="relative h-full overflow-hidden">
                    <CachedVideo
                      src={videoUrl || ""}
                      className="w-full h-full object-cover cursor-pointer"
                      controls={false}
                      autoPlay={false}
                      muted={true}
                      loop={true}
                      playsInline
                      onClick={() => handleAdminVideoClick(index)}
                    />
                    {/* Video Controls Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="text-white pointer-events-auto">
                        {activeVideo === index ? (
                          isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />
                        ) : (
                          <Play className="w-8 h-8" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          
          {/* Post Details Section - Always Visible */}
          <div className="bg-white p-4 space-y-3 border-t">
            {/* First Line: Rank, Other Rank, Type, Full Details */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {post.rank && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded text-xs font-bold">
                    #{post.rank}
                  </div>
                )}
                {formatOtherRank(post.otherRank) && (
                  <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                    {formatOtherRank(post.otherRank)}
                  </div>
                )}
                {post.type && (
                  <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                    Trend type - {post.type}
                  </div>
                )}
              </div>
              {post.detailsLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(post.detailsLink, '_blank')}
                  className="hover:bg-gray-50 text-xs text-blue-600"
                >
                  full details
                </Button>
              )}
            </div>

            {/* Second & Third Line: Title */}
            {post.title && (
              <div>
                <p className="text-gray-900 text-sm leading-relaxed font-medium">
                  {formatContent(post.title)}
                </p>
                {post.title.length > 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto text-blue-600 hover:text-blue-800 text-xs mt-1"
                    onClick={() => setExpandedContent(!expandedContent)}
                  >
                    {expandedContent ? "Show less" : "Show more"}
                  </Button>
                )}
              </div>
            )}

            {/* Fourth Line: Likes, Dislikes, Votes, Comments, Share */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLike}
                  disabled={likeMutation.isPending}
                  className={cn(
                    "flex items-center space-x-1 text-xs transition-colors",
                    isLiked 
                      ? "bg-green-100 text-green-700 hover:bg-green-150" 
                      : "hover:bg-green-50 hover:text-green-600"
                  )}
                >
                  <ThumbsUp className={cn("w-3 h-3", isLiked && "fill-current")} />
                  <span>{post.likesCount || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDislike}
                  disabled={dislikeMutation.isPending}
                  className={cn(
                    "flex items-center space-x-1 text-xs transition-colors",
                    isDisliked 
                      ? "bg-red-100 text-red-700 hover:bg-red-150" 
                      : "hover:bg-red-50 hover:text-red-600"
                  )}
                >
                  <ThumbsDown className={cn("w-3 h-3", isDisliked && "fill-current")} />
                  <span>{post.dislikesCount || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleVote}
                  disabled={voteMutation.isPending}
                  className={cn(
                    "flex items-center space-x-1 text-xs transition-colors",
                    isVoted 
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-150" 
                      : "hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  <span>vote</span>
                  <span>{post.votesCount || 0}</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComment}
                  className="hover:bg-gray-50"
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="hover:bg-gray-50"
                >
                  <Share2 className="w-3 h-3" />
                </Button>
                {/* Admin Edit/Delete Buttons */}
                {currentUser?.isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEdit}
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deletePostMutation.isPending}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Comment Modal */}
        <CommentModal 
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          postId={post.id}
          currentUser={currentUser}
        />

        {/* Edit Modal */}
        {currentUser?.isAdmin && (
          <EditPostModal 
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            post={post}
          />
        )}
      </>
    );
  }

  // Regular user post
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <CardContent className="p-0">
        {/* Fixed 16:9 Media Container */}
        <div className="relative w-full aspect-video bg-black">
          {(post.imageUrl || post.videoUrl) && (
            <>
              {post.videoUrl ? (
                <div className="relative h-full overflow-hidden">
                  <CachedVideo
                    src={post.videoUrl}
                    className="w-full h-full object-cover cursor-pointer"
                    controls={false}
                    autoPlay={false}
                    muted={true}
                    loop={true}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="text-white pointer-events-auto">
                      {isPlaying ? (
                        isMuted ? <VolumeX className="w-8 h-8" /> : <Volume2 className="w-8 h-8" />
                      ) : (
                        <Play className="w-8 h-8" />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <CachedImage
                  src={post.imageUrl}
                  alt="Post content"
                  className="w-full h-full object-cover"
                />
              )}
            </>
          )}
        </div>
      </CardContent>

      {/* Post Details Section - Always Visible */}
      <div className="bg-white p-4 space-y-3 border-t">
        {/* Caption */}
        {post.caption && (
          <div>
            <p className="text-gray-900 text-sm leading-relaxed font-medium">
              {formatContent(post.caption)}
            </p>
            {post.caption.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-blue-600 hover:text-blue-800 text-xs mt-1"
                onClick={() => setExpandedContent(!expandedContent)}
              >
                {expandedContent ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
        )}

        {/* Interaction Line: Likes, Link, Share */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={cn(
                "flex items-center space-x-1 text-xs transition-colors",
                isLiked 
                  ? "bg-green-100 text-green-700 hover:bg-green-150" 
                  : "hover:bg-green-50 hover:text-green-600"
              )}
            >
              <ThumbsUp className={cn("w-3 h-3", isLiked && "fill-current")} />
              <span>{post.likesCount || 0}</span>
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {post.link && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(post.link, '_blank')}
                className="hover:bg-gray-50 text-xs text-blue-600"
              >
                full details
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleComment}
              className="hover:bg-gray-50"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="hover:bg-gray-50"
            >
              <Share2 className="w-3 h-3" />
            </Button>
            {/* Admin Edit/Delete Buttons for all posts */}
            {currentUser?.isAdmin && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="hover:bg-blue-50 hover:text-blue-600"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deletePostMutation.isPending}
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal 
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        postId={post.id}
        currentUser={currentUser}
      />

      {/* Edit Modal */}
      {currentUser?.isAdmin && (
        <EditPostModal 
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          post={post}
        />
      )}
    </Card>
  );
}