import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { StoriesCarousel } from "@/components/stories/stories-carousel";
import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, Hash, User } from "lucide-react";
import { useState } from "react";
import Auth from "@/pages/auth";

const CATEGORIES = [
  { id: "all", label: "Top Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "film", label: "Film" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", "admin"],
    queryFn: async () => {
      const response = await fetch("/api/posts?adminOnly=true", {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  const { data: stories = [] } = useQuery({
    queryKey: ["/api/stories"],
    queryFn: async () => {
      const response = await fetch("/api/stories");
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    },
  });

  const { data: searchUsers = [] } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to search');
      const data = await response.json();
      return data.users || [];
    },
    enabled: !!searchQuery.trim(),
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 pb-20">
        {/* Search Bar */}
        <Card className="my-4">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery.trim() && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Search Results for "{searchQuery}"</h3>
              {searchUsers.length > 0 ? (
                <div className="space-y-3">
                  {searchUsers.map((searchUser: any) => (
                    <div 
                      key={searchUser.id} 
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => setLocation(`/profile/${searchUser.username}`)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={searchUser.avatar} alt={searchUser.username} />
                        <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                          {searchUser.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{searchUser.username}</p>
                        {searchUser.bio && (
                          <p className="text-sm text-gray-500 truncate">{searchUser.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No users found</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags Bar */}
        <Card className="my-4">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={`whitespace-nowrap text-xs px-3 py-1 ${
                    activeCategory === category.id
                      ? "gradient-bg text-white hover:opacity-90"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="w-24 h-4 bg-gray-200 rounded"></div>
                      <div className="w-16 h-3 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-full h-64 bg-gray-200 rounded mb-4"></div>
                  <div className="space-y-2">
                    <div className="w-full h-4 bg-gray-200 rounded"></div>
                    <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No trending posts yet</h3>
              <p className="text-gray-500">Be the first to create trending content!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}