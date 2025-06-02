import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Heart } from "lucide-react";
import Auth from "./auth";

export default function Circle() {
  const { isAuthenticated } = useAuth();

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
      
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Users className="h-6 w-6" />
            Your Circle
          </h1>
          <p className="text-gray-600 mt-1">Connect with friends and discover new people</p>
        </div>

        <div className="grid gap-6">
          {/* Mock Messages Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No messages yet</h3>
                <p className="text-gray-500">Start a conversation with someone from your circle</p>
                <p className="text-sm text-gray-400 mt-2">
                  💬 Real-time messaging coming soon!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Suggested for you
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No suggestions</h3>
                  <p className="text-gray-500">Check back later for new connection suggestions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestedUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar} alt={user.username} />
                          <AvatarFallback>{user.username[3]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-800">{user.username}</p>
                          <p className="text-sm text-gray-500">{user.bio || "TrendoTalk user"}</p>
                          <p className="text-xs text-gray-400">{user.followersCount} followers</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" className="gradient-bg text-white hover:opacity-90">
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mock Video Calls Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <i className="fas fa-video text-lg"></i>
                Video Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <i className="fas fa-video text-4xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No recent calls</h3>
                <p className="text-gray-500">Start a video call with someone from your circle</p>
                <p className="text-sm text-gray-400 mt-2">
                  📹 Video calling with WebRTC coming soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
