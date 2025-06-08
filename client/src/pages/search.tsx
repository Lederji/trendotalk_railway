import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowLeft, Hash, Users, Image, Video, Bookmark } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/layout/navigation";

export function SearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Search for users when typing in search bar
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/users/search', searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: () => fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`).then(res => res.json()),
  });

  // Type the search results properly
  const typedSearchResults = searchResults as Array<{
    id: number;
    username: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
  }>;

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

  const handlePostClick = (postId: number) => {
    // Navigate to post detail or expand post
    console.log('Post clicked:', postId);
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
        {/* Recent Searches / Trending (when no query) */}
        {!searchQuery && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Trending Hashtags</h2>
              <div className="grid grid-cols-2 gap-3">
                {mockHashtags.slice(0, 6).map((hashtag) => (
                  <div
                    key={hashtag.tag}
                    onClick={() => handleHashtagClick(hashtag.tag)}
                    className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-gray-100 hover:bg-white/90 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Hash className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">#{hashtag.tag}</h3>
                        <p className="text-sm text-gray-600">{hashtag.postCount} posts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Suggested Users</h2>
              <div className="space-y-3">
                {typedSearchResults.slice(0, 3).map((user) => (
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
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        Follow
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                          onClick={() => handlePostClick(post.id)}
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
                        onClick={() => handlePostClick(post.id)}
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