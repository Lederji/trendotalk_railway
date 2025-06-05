import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, Users, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/layout/navigation";
import Auth from "@/pages/auth";

export default function ChatsPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [shareVideoId, setShareVideoId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const video = urlParams.get('shareVideo');
    if (video) {
      setShareVideoId(video);
    }
  }, []);

  const { data: friends = [] } = useQuery({
    queryKey: ["/api/friends/status"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const response = await fetch(`/api/friends/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAuthenticated
  });

  const handleUserSelect = (userId: number) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSendVideo = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "Select recipients",
        description: "Please select at least one person to share with",
        variant: "destructive"
      });
      return;
    }

    try {
      // Here you would implement the actual video sharing logic
      // For now, we'll simulate the sharing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Video shared successfully!",
        description: `Shared with ${selectedUsers.size} people`,
      });
      
      // Redirect back to trends
      window.location.href = "/trends";
    } catch (error) {
      toast({
        title: "Failed to share video",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-white">
              {shareVideoId ? "Share Video" : "Circle Chats"}
            </h1>
          </div>

          {shareVideoId && (
            <Card className="bg-white/10 border-white/20 backdrop-blur-lg mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  Sharing Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-100 text-sm">
                    ✓ Video ready to share (ID: {shareVideoId})
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select People to Share With
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300">No friends found</p>
                  <p className="text-gray-400 text-sm">Follow some users to start sharing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend: any) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.has(friend.id)
                          ? 'bg-blue-500/30 border border-blue-400/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => handleUserSelect(friend.id)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                          {friend.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white font-medium">{friend.username}</p>
                        {selectedUsers.has(friend.id) && (
                          <p className="text-blue-300 text-sm">Selected ✓</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {shareVideoId && selectedUsers.size > 0 && (
                <div className="pt-4">
                  <Button
                    onClick={handleSendVideo}
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Share Video ({selectedUsers.size} selected)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}