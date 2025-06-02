import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { StoriesCarousel } from "@/components/stories/stories-carousel";
import { PostCard } from "@/components/post/post-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

const CATEGORIES = [
  { id: "all", label: "All Trends" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "film", label: "Film" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts", activeCategory],
    queryFn: async () => {
      const url = activeCategory === "all" 
        ? "/api/posts" 
        : `/api/posts?category=${activeCategory}`;
      const response = await fetch(url, {
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

  const { data: suggestedUsers = [] } = useQuery({
    queryKey: ["/api/users/suggested"],
    queryFn: async () => {
      const response = await fetch("/api/users/suggested", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch suggested users');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 pb-20 md:pb-4">
        {/* Tags Bar */}
        <Card className="my-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar (Desktop) */}
          <div className="hidden lg:block space-y-6">
            {/* Stories Section */}
            {stories.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Stories</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {stories.slice(0, 9).map((story: any) => (
                      <div key={story.id} className="flex flex-col items-center cursor-pointer group">
                        <div className="gradient-border group-hover:scale-105 transition-transform duration-200">
                          <div className="gradient-border-inner p-1">
                            <Avatar className="w-14 h-14">
                              <AvatarImage src={story.user.avatar} alt={story.user.username} />
                              <AvatarFallback>{story.user.username[3]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 mt-1 truncate w-full text-center">
                          {story.user.username}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-4">Suggested for you</h3>
                  <div className="space-y-3">
                    {suggestedUsers.map((suggestedUser: any) => (
                      <div key={suggestedUser.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={suggestedUser.avatar} alt={suggestedUser.username} />
                            <AvatarFallback>{suggestedUser.username[3]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{suggestedUser.username}</p>
                            <p className="text-xs text-gray-500">{suggestedUser.followersCount} followers</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-blue-500 hover:text-purple-600">
                          Follow
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mobile Stories */}
            <div className="lg:hidden">
              <StoriesCarousel stories={stories} />
            </div>

            {/* Posts Feed */}
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
                  <p className="text-gray-500">No posts found for this category.</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
