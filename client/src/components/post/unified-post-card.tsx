import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Vote, ExternalLink, ChevronDown, ChevronUp, Play, Pause, VolumeX, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    };
  };
}

export function UnifiedPostCard({ post }: UnifiedPostCardProps) {
  const [expandedContent, setExpandedContent] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const singleVideoRef = useRef<HTMLVideoElement | null>(null);

  // Determine if this is an admin video post or regular post
  const isAdminVideoPost = post.isAdminPost && (post.video1Url || post.video2Url || post.video3Url);
  const isRegularPost = !post.isAdminPost;

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
    if (!otherRank) return "__";
    return otherRank;
  };

  if (isAdminVideoPost) {
    return (
      <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <CardContent className="p-0">
          {/* 16:9 Video Container */}
          <div className="relative w-full aspect-video bg-black">
            <div className={cn("grid h-full", getVideoLayout())}>
              {adminVideos.map((videoUrl, index) => (
                <div key={`video-${post.id}-${index}`} className="relative h-full">
                  <video
                    ref={(el) => (videoRefs.current[index] = el)}
                    src={videoUrl || ""}
                    className="w-full h-full object-cover cursor-pointer"
                    loop
                    muted
                    autoPlay
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
          {/* First Line: Rank, Other Rank, Type */}
          <div className="flex items-center space-x-3">
            {post.rank && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded text-xs font-bold">
                #{post.rank}
              </div>
            )}
            {post.otherRank && (
              <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                {formatOtherRank(post.otherRank)}
              </div>
            )}
            {post.type && (
              <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                #{post.type}
              </div>
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

          {/* Fourth Line: Likes, Dislikes, Votes, Details Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:bg-green-50 hover:text-green-600 text-xs">
                <ThumbsUp className="w-3 h-3" />
                <span>{post.likesCount || 0}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:bg-red-50 hover:text-red-600 text-xs">
                <ThumbsDown className="w-3 h-3" />
                <span>{post.dislikesCount || 0}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:bg-blue-50 hover:text-blue-600 text-xs">
                <Vote className="w-3 h-3" />
                <span>{post.votesCount || 0}</span>
              </Button>
            </div>
            {post.detailsLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(post.detailsLink, '_blank')}
                className="hover:bg-gray-50"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* User Info */}
          <div className="text-xs text-gray-500 border-t pt-2">
            <span>@{post.user.username} • Admin Post</span>
          </div>
        </div>
      </Card>
    );
  }

  // Regular user post
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <CardContent className="p-0">
        {/* Media Section */}
        {(post.imageUrl || post.videoUrl) && (
          <div className="relative w-full aspect-video bg-black">
            {post.videoUrl ? (
              <div className="relative h-full">
                <video
                  ref={singleVideoRef}
                  src={post.videoUrl}
                  className="w-full h-full object-cover cursor-pointer"
                  loop
                  muted
                  autoPlay
                  playsInline
                  onClick={handleRegularVideoClick}
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
              <img
                src={post.imageUrl}
                alt="Post content"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        )}
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

        {/* Interaction Line: Likes and Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 hover:bg-green-50 hover:text-green-600 text-xs">
              <ThumbsUp className="w-3 h-3" />
              <span>{post.likesCount || 0}</span>
            </Button>
          </div>
          {post.link && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(post.link, '_blank')}
              className="hover:bg-gray-50 text-xs"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className="text-xs text-gray-500 border-t pt-2">
          <span>@{post.user.username} • User Post</span>
        </div>
      </div>
    </Card>
  );
}