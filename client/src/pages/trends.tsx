import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share, Link as LinkIcon, MoreVertical } from "lucide-react";
import Auth from "@/pages/auth";

export default function Trends() {
  const { isAuthenticated } = useAuth();

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
            <div key={post.id} className="relative h-screen snap-start overflow-hidden">
              {/* Video Background */}
              <video
                src={post.videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
              
              {/* Right Side Actions */}
              <div className="absolute right-3 bottom-20 flex flex-col items-center space-y-6">
                {/* Profile Avatar */}
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-white">
                    <AvatarImage src={post.user.avatar} alt={post.user.username} />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                      {post.user.username[3]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 p-0">
                    +
                  </Button>
                </div>
                
                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                  >
                    <Heart className="w-7 h-7" />
                  </Button>
                  <span className="text-white text-xs font-semibold mt-1">
                    {post.likesCount > 999 
                      ? `${(post.likesCount / 1000).toFixed(1)}k` 
                      : post.likesCount
                    }
                  </span>
                </div>
                
                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-12 h-12 rounded-full text-white hover:bg-white/20 p-0"
                  >
                    <MessageCircle className="w-7 h-7" />
                  </Button>
                  <span className="text-white text-xs font-semibold mt-1">
                    {post.commentsCount > 999 
                      ? `${(post.commentsCount / 1000).toFixed(1)}k` 
                      : post.commentsCount
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
                {/* Username and Follow Button */}
                <div className="flex items-center space-x-3 mb-3">
                  <span className="text-white font-bold text-base">{post.user.username}</span>
                  <Button className="px-4 py-1 bg-transparent border border-white text-white text-sm font-semibold rounded hover:bg-white hover:text-black transition-colors">
                    Follow
                  </Button>
                </div>
                
                {/* Caption */}
                <p className="text-white text-sm mb-2 line-clamp-2">{post.caption}</p>
                
                {/* Link indicator with music note styling */}
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
    </div>
  );
}