import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { CreateRegularPost } from "@/components/post/create-regular-post";
import { CreateVideoPost } from "@/components/post/create-video-post";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Image } from "lucide-react";
import { useState } from "react";
import Auth from "./auth";

export default function Create() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"video" | "regular">(user?.isAdmin ? "video" : "regular");

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {user?.isAdmin && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={activeTab === "video" ? "default" : "outline"}
                  size="sm"
                  className={`flex items-center space-x-2 ${
                    activeTab === "video"
                      ? "gradient-bg text-white"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("video")}
                >
                  <Video className="w-4 h-4" />
                  <span>Admin Video Post</span>
                </Button>
                
                <Button
                  variant={activeTab === "regular" ? "default" : "outline"}
                  size="sm"
                  className={`flex items-center space-x-2 ${
                    activeTab === "regular"
                      ? "gradient-bg text-white"
                      : "hover:bg-gray-100"
                  }`}
                  onClick={() => setActiveTab("regular")}
                >
                  <Image className="w-4 h-4" />
                  <span>Regular Post</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="gradient-text">
              {user?.isAdmin && activeTab === "video" 
                ? "Create Trending Video Post" 
                : user?.isAdmin 
                ? "Create Regular Post" 
                : "Create Post"
              }
            </CardTitle>
            <p className="text-gray-600">
              {user?.isAdmin && activeTab === "video"
                ? "Create trending video content with rankings and categories"
                : user?.isAdmin 
                ? "Share regular content with the community"
                : "Share your content with the community"
              }
            </p>
          </CardHeader>
          <CardContent>
            {user?.isAdmin && activeTab === "video" ? (
              <CreateVideoPost />
            ) : (
              <CreateRegularPost />
            )}
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
}
