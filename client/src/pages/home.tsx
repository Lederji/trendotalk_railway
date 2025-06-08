import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { UnifiedPostCard } from "@/components/post/unified-post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Hash } from "lucide-react";
import { useState } from "react";
import Auth from "@/pages/auth";

const CATEGORIES = [
  { id: "all", label: "Top Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "x", label: "X" },
  { id: "films", label: "Films" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", "admin-only"],
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

  // Filter admin posts based on active category
  const filteredPosts = allPosts.filter((post: any) => {
    if (activeCategory === "all") {
      return post.isAdminPost;
    } else {
      if (post.otherRank) {
        const otherRankLower = post.otherRank.toLowerCase();
        if (activeCategory === "youtube") {
          return otherRankLower.includes("youtube") || otherRankLower.includes("yt");
        } else if (activeCategory === "instagram") {
          return otherRankLower.includes("instagram") || otherRankLower.includes("insta");
        } else if (activeCategory === "films") {
          return otherRankLower.includes("films") || otherRankLower.includes("film");
        } else {
          return otherRankLower.includes(activeCategory);
        }
      }
      return false;
    }
  }).sort((a: any, b: any) => {
    if (activeCategory === "all") {
      if (a.rank && !b.rank) return -1;
      if (!a.rank && b.rank) return 1;
      if (a.rank && b.rank) return (a.rank || 999) - (b.rank || 999);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    } else {
      const getRankFromOtherRank = (otherRank: string) => {
        const match = otherRank.match(/#(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      return getRankFromOtherRank(a.otherRank || "") - getRankFromOtherRank(b.otherRank || "");
    }
  });

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

        {/* Video Posts Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="w-full aspect-video bg-gray-200 rounded-t"></div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-4 bg-gray-200 rounded"></div>
                      <div className="w-12 h-4 bg-gray-200 rounded"></div>
                      <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-4 bg-gray-200 rounded"></div>
                      <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                      <div className="w-12 h-6 bg-gray-200 rounded"></div>
                      <div className="w-12 h-6 bg-gray-200 rounded"></div>
                      <div className="w-12 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No trending videos yet</h3>
              <p className="text-gray-500">Admin hasn't posted any videos in this category!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post: any) => (
              <UnifiedPostCard
                key={post.id}
                post={post}
                currentUser={user}
              />
            ))}
          </div>
        )}
      </div>
      
      <Navigation />
    </div>
  );
}