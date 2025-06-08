import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, Users, Image, Video, Bookmark, Heart, MessageCircle, VolumeX, Volume2, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";

// Custom hook for video intersection observer
function useVideoInView(videoRef: React.RefObject<HTMLVideoElement>) {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Video starts playing when 50% visible
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, [videoRef]);

  return isInView;
}

// Video component with lazy loading
function LazyVideo({ post, isMuted, onToggleMute, onVideoClick }: {
  post: any;
  isMuted: boolean;
  onToggleMute: (e: React.MouseEvent) => void;
  onVideoClick: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useVideoInView(videoRef);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      video.play().catch(console.error);
      console.log(`Instagram-style autoplay: video ${post.id} (${isMuted ? 'muted' : 'unmuted'})`);
    } else {
      video.pause();
    }
  }, [isInView, post.id, isMuted]);

  return (
    <div 
      onClick={onVideoClick}
      className="w-full h-full relative cursor-pointer"
    >
      <video 
        ref={videoRef}
        src={post.video1Url || post.videoUrl}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        poster={post.imageUrl}
        playsInline
      />
      {/* Mute/Unmute Button */}
      <button
        onClick={onToggleMute}
        className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

export function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [mutedVideos, setMutedVideos] = useState<Set<number>>(new Set());

  // Search for users when typing in search bar
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  // Fetch posts from followed users for Instagram-style feed
  const { data: topPosts = [] } = useQuery({
    queryKey: ['/api/posts/following'],
    queryFn: async () => {
      const response = await fetch('/api/posts/following', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch posts");
      return response.json();
    },
    enabled: !searchQuery, // Only show when not searching
  });

  // Type the search results properly and ensure it's always an array
  const typedSearchResults = Array.isArray(searchResults) ? searchResults as Array<{
    id: number;
    username: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
  }> : [];

  // Mock data for different search types
  const mockPosts = [
    {
      id: 1,
      type: "video",
      caption: "Amazing sunset #nature #sunset #beautiful",
      imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop",
      videoUrl: null,
      user: {
        username: "nature_lover",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
      },
      likesCount: 42,
      timestamp: "2 hours ago"
    },
    {
      id: 2,
      type: "image",
      caption: "Morning coffee ☕ #coffee #morning #life",
      imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&h=300&fit=crop",
      videoUrl: null,
      user: {
        username: "coffee_addict",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
      },
      likesCount: 28,
      timestamp: "4 hours ago"
    }
  ];

  const mockHashtags = [
    { tag: "nature", postCount: 1250 },
    { tag: "sunset", postCount: 890 },
    { tag: "coffee", postCount: 567 },
    { tag: "morning", postCount: 432 },
    { tag: "beautiful", postCount: 2100 }
  ];

  const filteredPosts = mockPosts.filter(post => 
    post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHashtags = mockHashtags.filter(hashtag => 
    hashtag.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = (username: string) => {
    setLocation(`/profile/${username}`);
  };

  const handleHashtagClick = (hashtag: string) => {
    setSearchQuery(`#${hashtag}`);
    setActiveTab("posts");
  };

  const handleVideoClick = (postId: number) => {
    setLocation('/trends');
  };

  const toggleMute = (postId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search users, hashtags, posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white/70 backdrop-blur-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500/20"
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Instagram-style Feed (when no query) */}
        {!searchQuery && (
          <div className="space-y-4 pb-20">
            {Array.isArray(topPosts) && topPosts.length > 0 ? (
              topPosts.map((post: any) => (
                <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-gray-200">
                        <AvatarImage src={post.user?.avatar} alt={post.user?.username} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                          {post.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {post.user?.username || 'Unknown User'}
                        </h3>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-gray-400 h-8 w-8 p-0">
                      •••
                    </Button>
                  </div>

                  {/* Post Image/Video */}
                  {(post.imageUrl || post.video1Url || post.videoUrl) && (
                    <div className="aspect-square bg-gray-100 relative">
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl} 
                          alt={post.caption || post.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (post.video1Url || post.videoUrl) ? (
                        <LazyVideo
                          post={post}
                          isMuted={mutedVideos.has(post.id)}
                          onToggleMute={(e) => toggleMute(post.id, e)}
                          onVideoClick={() => handleVideoClick(post.id)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <Image className="h-12 w-12 text-purple-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="p-0 h-auto text-gray-700 hover:text-red-500">
                            <Heart className="h-6 w-6" />
                          </Button>
                          <span className="text-sm font-semibold text-gray-900">
                            {post.likesCount || post.votesCount || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="p-0 h-auto text-gray-700 hover:text-blue-500">
                            <MessageCircle className="h-6 w-6" />
                          </Button>
                          <span className="text-sm font-semibold text-gray-900">
                            {post.commentsCount || 0}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" className="p-0 h-auto text-gray-700 hover:text-purple-500">
                          <Send className="h-6 w-6" />
                        </Button>

                      </div>
                      <Button variant="ghost" size="sm" className="p-0 h-auto text-gray-700 hover:text-purple-500">
                        <Bookmark className="h-6 w-6" />
                      </Button>
                    </div>

                    {/* Post Caption */}
                    {(post.caption || post.title) && (
                      <div className="mb-2">
                        <p className="text-sm text-gray-900">
                          {post.caption || post.title}
                        </p>
                      </div>
                    )}


                  </div>


                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <Image className="h-8 w-8 text-purple-400" />
                </div>
                <p className="text-gray-500">No posts available</p>
                <p className="text-sm text-gray-400 mt-1">Start following users or create your first post</p>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/70 backdrop-blur-sm rounded-xl p-1">
                <TabsTrigger 
                  value="all" 
                  className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="hashtags" 
                  className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Hash className="h-4 w-4 mr-1" />
                  Tags
                </TabsTrigger>
                <TabsTrigger 
                  value="posts" 
                  className="rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
                >
                  <Image className="h-4 w-4 mr-1" />
                  Posts
                </TabsTrigger>
              </TabsList>

              {/* All Tab */}
              <TabsContent value="all" className="space-y-6">
                {/* Users Section */}
                {typedSearchResults.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Users</h3>
                    <div className="space-y-2">
                      {typedSearchResults.slice(0, 3).map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleUserClick(user.username)}
                          className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              <AvatarImage src={user.avatar} alt={user.displayName || user.username} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                                {(user.displayName || user.username).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">
                                {user.displayName || user.username}
                              </h4>
                              <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags Section */}
                {filteredHashtags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Hashtags</h3>
                    <div className="space-y-2">
                      {filteredHashtags.slice(0, 3).map((hashtag) => (
                        <div
                          key={hashtag.tag}
                          onClick={() => handleHashtagClick(hashtag.tag)}
                          className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              <Hash className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">#{hashtag.tag}</h4>
                              <p className="text-sm text-gray-600">{hashtag.postCount} posts</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Section */}
                {filteredPosts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Posts</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredPosts.slice(0, 4).map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handleVideoClick(post.id)}
                          className="bg-white/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                        >
                          <div className="aspect-square">
                            <img 
                              src={post.imageUrl} 
                              alt={post.caption}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={post.user.avatar} />
                                <AvatarFallback className="text-xs">{post.user.username[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-gray-500">@{post.user.username}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {typedSearchResults.length === 0 && filteredHashtags.length === 0 && filteredPosts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-gray-500">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-3">
                {typedSearchResults.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-gray-500">No users found for "{searchQuery}"</p>
                  </div>
                ) : (
                  typedSearchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleUserClick(user.username)}
                      className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={user.avatar} alt={user.displayName || user.username} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                            {(user.displayName || user.username).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {user.displayName || user.username}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">@{user.username}</p>
                          {user.bio && <p className="text-sm text-gray-500 truncate mt-1">{user.bio}</p>}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none hover:from-purple-600 hover:to-pink-600"
                        >
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Hashtags Tab */}
              <TabsContent value="hashtags" className="space-y-3">
                {filteredHashtags.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <Hash className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-gray-500">No hashtags found for "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredHashtags.map((hashtag) => (
                    <div
                      key={hashtag.tag}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                      className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Hash className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">#{hashtag.tag}</h3>
                          <p className="text-sm text-gray-600">{hashtag.postCount} posts</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        >
                          View Posts
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Posts Tab */}
              <TabsContent value="posts" className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-purple-400" />
                    </div>
                    <p className="text-gray-500">No posts found for "{searchQuery}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handleVideoClick(post.id)}
                        className="bg-white/70 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                      >
                        <div className="aspect-square relative">
                          <img 
                            src={post.imageUrl} 
                            alt={post.caption}
                            className="w-full h-full object-cover"
                          />
                          {post.type === "video" && (
                            <div className="absolute top-2 right-2">
                              <Video className="h-5 w-5 text-white drop-shadow-lg" />
                            </div>
                          )}
                          <div className="absolute bottom-2 left-2 right-2">
                            <Badge className="bg-black/50 text-white text-xs">
                              {post.likesCount} likes
                            </Badge>
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={post.user.avatar} />
                              <AvatarFallback className="text-xs">{post.user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-500">@{post.user.username}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400">{post.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <Navigation />
    </div>
  );
}