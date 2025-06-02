import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, TrendingUp } from "lucide-react";
import Auth from "@/pages/auth";

export default function SearchPage() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Get trending posts (user-generated content from trends)
  const { data: trendingPosts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", "trends"],
    queryFn: async () => {
      const response = await fetch("/api/posts?adminOnly=false", {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch trending posts');
      return response.json();
    },
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 py-4 pb-20">
        {/* Search Input */}
        <div className="relative mb-6">
          <Input
            type="text"
            placeholder="Search users, trends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none focus:bg-white focus:ring-2 focus:ring-purple-300 rounded-full text-base"
            autoFocus
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>

        {/* Trending Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">Trending Now</h2>
          </div>
          
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
                    <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                      <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trendingPosts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No trending posts yet</h3>
                <p className="text-gray-500">Be the first to create a trend!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {trendingPosts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Navigation />
    </div>
  );
}