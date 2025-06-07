import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Heart, MessageCircle, Share } from "lucide-react";

export default function PostDetail() {
  const { postId } = useParams();
  const [, setLocation] = useLocation();

  const { data: post, isLoading } = useQuery({
    queryKey: ['/api/posts', postId],
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Post not found</h2>
          <Button onClick={() => setLocation('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const renderMedia = () => {
    // Admin posts (multi-video)
    if (post.isAdminPost && (post.video1Url || post.video2Url || post.video3Url)) {
      return (
        <div className="space-y-4">
          {[post.video1Url, post.video2Url, post.video3Url].filter(Boolean).map((videoUrl, index) => (
            <div key={index} className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
                preload="metadata"
              />
            </div>
          ))}
        </div>
      );
    }

    // Regular user posts
    if (post.videoUrl) {
      return (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <video
            src={post.videoUrl}
            controls
            className="w-full h-full object-cover"
            preload="metadata"
          />
        </div>
      );
    }

    if (post.imageUrl) {
      return (
        <div className="aspect-square rounded-lg overflow-hidden">
          <img
            src={post.imageUrl}
            alt={post.caption || "Post image"}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <Button 
            onClick={() => setLocation('/')} 
            variant="ghost" 
            size="sm"
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-6">
            {/* User Header */}
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={post.user?.avatar} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {post.user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {post.user?.username}
                </h3>
                {post.user?.isAdmin && (
                  <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Post Title */}
            {post.title && (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {post.title}
              </h1>
            )}

            {/* Media Content */}
            <div className="mb-4">
              {renderMedia()}
            </div>

            {/* Caption */}
            {post.caption && (
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {post.caption}
              </p>
            )}

            {/* Link */}
            {post.link && (
              <div className="mb-4">
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {post.link}
                </a>
              </div>
            )}

            {/* Interaction Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-6">
                <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                  <Heart className="w-5 h-5" />
                  <span>{post.likesCount || 0}</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span>Comment</span>
                </button>
              </div>
              <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-green-500 transition-colors">
                <Share className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Post Stats */}
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>{post.viewsCount || 0} views</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}