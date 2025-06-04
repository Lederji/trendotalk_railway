import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Vote, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPostCardProps {
  post: {
    id: number;
    title: string;
    video1Url?: string;
    video2Url?: string;
    video3Url?: string;
    rank: number;
    otherRank?: string;
    category: string;
    type?: string;
    detailsLink?: string;
    likesCount: number;
    dislikesCount: number;
    votesCount: number;
    user: {
      username: string;
      avatar?: string;
    };
  };
}

export function VideoPostCard({ post }: VideoPostCardProps) {
  const [expandedTitle, setExpandedTitle] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const videos = [post.video1Url, post.video2Url, post.video3Url].filter(Boolean);
  const videoCount = videos.length;

  const handleVideoClick = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;

    if (activeVideo === index) {
      // If already playing, mute/unmute
      video.muted = !video.muted;
    } else {
      // Pause all other videos
      videoRefs.current.forEach((v, i) => {
        if (v && i !== index) {
          v.pause();
          v.muted = true;
        }
      });
      
      // Play selected video with sound
      video.muted = false;
      video.play();
      setActiveVideo(index);
    }
  };

  const getVideoLayout = () => {
    if (videoCount === 1) {
      return "grid-cols-1";
    } else if (videoCount === 2) {
      return "grid-cols-2 gap-1";
    } else if (videoCount === 3) {
      return "grid-cols-3 gap-1";
    }
    return "grid-cols-1";
  };

  const getVideoClass = (videoUrl: string) => {
    // Check if video is vertical (reel format) or horizontal (YouTube format)
    // For now, we'll assume based on aspect ratio or you can add metadata
    return "w-full h-full object-cover cursor-pointer";
  };

  const formatTitle = (title: string) => {
    if (expandedTitle || title.length <= 100) {
      return title;
    }
    return title.substring(0, 100) + "...";
  };

  const formatOtherRank = (otherRank?: string) => {
    if (!otherRank) return "__";
    return otherRank;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <CardContent className="p-0">
        {/* 16:9 Video Container */}
        <div className="relative w-full aspect-video bg-black">
          <div className={cn("grid h-full", getVideoLayout())}>
            {videos.map((videoUrl, index) => (
              <div key={index} className="relative h-full">
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  src={videoUrl}
                  className={getVideoClass(videoUrl)}
                  loop
                  muted
                  autoPlay
                  playsInline
                  onClick={() => handleVideoClick(index)}
                />
                {/* Mute indicator */}
                {activeVideo !== index && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">🔇</span>
                    </div>
                  </div>
                )}
                {/* Details link overlay at video end */}
                {post.detailsLink && (
                  <div className="absolute bottom-2 right-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-black bg-opacity-70 text-white hover:bg-opacity-90"
                      onClick={() => post.detailsLink && window.open(post.detailsLink, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Post Information */}
        <div className="p-4 space-y-3">
          {/* First Line: Rank, Other Rank, Type */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-pink-600">#{post.rank}</span>
              <span className="text-gray-600">{formatOtherRank(post.otherRank)}</span>
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                {post.type || post.category}
              </span>
            </div>
          </div>

          {/* Title Lines */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
              {formatTitle(post.title)}
            </h3>
            {post.title.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
                onClick={() => setExpandedTitle(!expandedTitle)}
              >
                {expandedTitle ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    ...more
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-green-600 hover:text-green-700">
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">{post.likesCount}</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-red-600 hover:text-red-700">
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm">{post.dislikesCount}</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-blue-600 hover:text-blue-700">
                <Vote className="w-4 h-4" />
                <span className="text-sm">{post.votesCount}</span>
              </Button>
            </div>

            {post.detailsLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(post.detailsLink, '_blank')}
                className="flex items-center space-x-1"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Details</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}