import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { VideoPostCard } from "@/components/post/video-post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hash } from "lucide-react";
import { useState } from "react";
import Auth from "@/pages/auth";

const CATEGORIES = [
  { id: "all", label: "Top Trends" },
  { id: "yt", label: "YouTube" },
  { id: "insta", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "film", label: "Film" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
  { id: "memes", label: "Memes" },
  { id: "reels", label: "Reels" },
  { id: "news", label: "News" },
  { id: "dialogue", label: "Dialogue" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: allPosts = [], isLoading } = useQuery({
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

  // Filter posts based on active category
  const filteredPosts = allPosts.filter((post: any) => {
    if (activeCategory === "all") {
      // Show posts that have rank but no otherRank, or have both rank and otherRank
      return post.rank;
    } else {
      // Show posts that have otherRank matching the category (e.g., "yt:#1" for YouTube)
      return post.otherRank && post.otherRank.toLowerCase().startsWith(activeCategory + ":");
    }
  }).sort((a: any, b: any) => a.rank - b.rank); // Sort by rank ascending

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 pb-20">
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