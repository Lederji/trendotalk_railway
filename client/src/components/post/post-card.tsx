import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Play } from "lucide-react";

interface PostCardProps {
  post: {
    id: number;
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    likesCount: number;
    commentsCount: number;
    isLiked?: boolean;
    createdAt: string;
    user: {
      id: number;
      username: string;
      avatar?: string;
      isAdmin: boolean;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/like`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: data.liked ? "Post liked!" : "Post unliked!",
        description: `${data.likesCount} ${data.likesCount === 1 ? 'like' : 'likes'}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/posts/${post.id}/comments`, { content });
      return response.json();
    },
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Comment added!",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to like posts",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to comment",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(commentText.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.user.avatar} alt={post.user.username} />
              <AvatarFallback>{post.user.username[3]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                {post.user.username}
                {post.user.isAdmin && (
                  <Badge variant="secondary" className="gradient-bg text-white text-xs">
                    <i className="fas fa-check-circle mr-1"></i>
                  </Badge>
                )}
              </h4>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Post Media */}
        {(post.imageUrl || post.videoUrl) && (
          <div className="relative">
            {post.imageUrl ? (
              <img 
                src={post.imageUrl} 
                alt="Post content" 
                className="w-full h-auto object-cover max-h-96"
              />
            ) : post.videoUrl ? (
              <div className="relative bg-black">
                <video 
                  src={post.videoUrl}
                  className="w-full h-auto object-cover max-h-96"
                  controls={false}
                  poster={post.imageUrl}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100">
                    <Play className="h-6 w-6 text-blue-600 ml-1" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Post Actions */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className={`p-0 hover:text-red-500 transition-colors ${
                  post.isLiked ? "text-red-500" : "text-gray-600"
                }`}
                onClick={handleLike}
                disabled={likeMutation.isPending}
              >
                <Heart className={`h-6 w-6 ${post.isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:text-gray-700 transition-colors text-gray-600"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 hover:text-gray-700 transition-colors text-gray-600"
              >
                <Share className="h-6 w-6" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 hover:text-gray-700 transition-colors text-gray-600"
            >
              <Bookmark className="h-6 w-6" />
            </Button>
          </div>

          <p className="font-semibold text-gray-800 mb-2">
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </p>
          
          <div className="mb-2">
            <span className="font-semibold text-gray-800">{post.user.username}</span>
            <span className="text-gray-700 ml-2">{post.caption}</span>
          </div>

          {post.commentsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 text-gray-500 text-sm mb-2 hover:text-gray-700"
              onClick={() => setShowComments(!showComments)}
            >
              View all {post.commentsCount} comments
            </Button>
          )}

          {/* Comment Input */}
          {isAuthenticated && (
            <div className="flex items-center space-x-3 pt-2 border-t border-gray-100">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <Input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-none bg-transparent outline-none focus:ring-0 text-gray-700 placeholder-gray-400"
              />
              {commentText.trim() && (
                <Button
                  size="sm"
                  className="text-blue-500 font-medium hover:text-purple-600"
                  onClick={handleComment}
                  disabled={commentMutation.isPending}
                >
                  {commentMutation.isPending ? "Posting..." : "Post"}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
