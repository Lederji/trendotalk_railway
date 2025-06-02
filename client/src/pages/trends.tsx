import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import Auth from "./auth";

const CATEGORIES = [
  { id: "all", label: "All Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "film", label: "Film" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export default function Trends() {
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", activeCategory, "user"],
    queryFn: async () => {
      // Get user posts only (not admin posts)
      const url = activeCategory === "all" 
        ? "/api/posts?adminOnly=false" 
        : `/api/posts?category=${activeCategory}&adminOnly=false`;
      const response = await fetch(url, {
        headers: isAuthenticated ? {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        } : {}
      });
      if (!response.ok) throw new Error('Failed to fetch trends');
      return response.json();
    },
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 pb-20 md:pb-4">
        {/* Page Title */}
        <div className="my-6">
          <h1 className="text-2xl font-bold gradient-text">Trending Now</h1>
          <p className="text-gray-600 mt-1">Discover what's trending in the community</p>
        </div>

        {/* Category Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={`whitespace-nowrap ${
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

        {/* Trends Feed */}
        {isLoading ? (
          <div className="space-y-6">
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
                    <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-center">
                <i className="fas fa-fire text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No trends found</h3>
                <p className="text-gray-500">
                  {activeCategory === "all" 
                    ? "Be the first to create a trend!" 
                    : `No trends found in ${CATEGORIES.find(c => c.id === activeCategory)?.label}`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
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
