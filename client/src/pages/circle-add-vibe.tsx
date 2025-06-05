import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Video, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/layout/navigation";
import Auth from "@/pages/auth";

export default function CircleAddVibe() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Get video ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const video = urlParams.get('video');
    if (video) {
      setVideoId(video);
    }
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your vibe",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Here you would implement the actual vibe creation logic
      // For now, we'll just show success message
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload
      
      toast({
        title: "Vibe created successfully!",
        description: "Your vibe has been added to Circle",
      });
      
      // Redirect back to circle page
      window.location.href = "/circle";
    } catch (error) {
      toast({
        title: "Failed to create vibe",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
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
            <h1 className="text-2xl font-bold text-white">Add to Circle Vibe</h1>
          </div>

          <Card className="bg-white/10 border-white/20 backdrop-blur-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Video className="w-5 h-5" />
                Create Your Vibe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {videoId && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-100 text-sm">
                    ✓ Video selected (ID: {videoId})
                  </p>
                </div>
              )}

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Vibe Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your vibe a catchy title..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  Description (Optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell your circle about this vibe..."
                  rows={4}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || !title.trim()}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Creating Vibe...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Create Vibe
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}