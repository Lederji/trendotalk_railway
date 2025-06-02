import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { CreatePost } from "@/components/post/create-post";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Auth from "./auth";

export default function Create() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="gradient-text">
              {user?.isAdmin ? "Create Post" : "Create Trend"}
            </CardTitle>
            <p className="text-gray-600">
              {user?.isAdmin 
                ? "Share content that will appear on the homepage feed"
                : "Share your latest trend with the community"
              }
            </p>
          </CardHeader>
          <CardContent>
            <CreatePost />
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
}
