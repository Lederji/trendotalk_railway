import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface VideoUpload {
  file: File | null;
  url: string;
}

export function CreateVideoPost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [rank, setRank] = useState("");
  const [otherRankPlatform, setOtherRankPlatform] = useState("");
  const [otherRankNumber, setOtherRankNumber] = useState("");
  const [type, setType] = useState("");
  const [detailsLink, setDetailsLink] = useState("");
  const [videos, setVideos] = useState<VideoUpload[]>([
    { file: null, url: "" },
    { file: null, url: "" },
    { file: null, url: "" }
  ]);

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const formData = new FormData();
      formData.append('title', postData.title);
      formData.append('rank', postData.rank);
      if (postData.otherRank) formData.append('otherRank', postData.otherRank);
      if (postData.type) formData.append('type', postData.type);
      if (postData.detailsLink) formData.append('detailsLink', postData.detailsLink);
      
      // Add video files
      videos.forEach((video, index) => {
        if (video.file) {
          formData.append(`video${index + 1}`, video.file);
        }
      });

      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Video post created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTitle("");
    setRank("");
    setOtherRankPlatform("");
    setOtherRankNumber("");
    setType("");
    setDetailsLink("");
    setVideos([
      { file: null, url: "" },
      { file: null, url: "" },
      { file: null, url: "" }
    ]);
  };

  const handleVideoUpload = (index: number, file: File) => {
    const newVideos = [...videos];
    newVideos[index] = { file, url: URL.createObjectURL(file) };
    setVideos(newVideos);
  };

  const removeVideo = (index: number) => {
    const newVideos = [...videos];
    if (newVideos[index].url) {
      URL.revokeObjectURL(newVideos[index].url);
    }
    newVideos[index] = { file: null, url: "" };
    setVideos(newVideos);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only require at least one video - all other fields are optional for admin
    const hasVideos = videos.some(video => video.file);
    if (!hasVideos) {
      toast({
        title: "Error",
        description: "At least one video is required",
        variant: "destructive",
      });
      return;
    }

    // Build other rank string if platform and number are provided
    const otherRank = otherRankPlatform && otherRankNumber 
      ? `on ${otherRankPlatform}:#${otherRankNumber}`
      : undefined;

    createPostMutation.mutate({
      title: title.trim() || undefined,
      rank: rank ? Number(rank) : undefined,
      otherRank,
      type: type.trim() || undefined,
      detailsLink: detailsLink.trim() || undefined,
    });
  };

  if (!user?.isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Admin access required to create video posts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Video Uploads */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Videos (Max 3)</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {videos.map((video, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm text-gray-600">Video {index + 1}</Label>
              <div className="relative aspect-video border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                {video.url ? (
                  <div className="relative w-full h-full">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeVideo(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Upload Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(index, file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Textarea
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter video title..."
          className="min-h-[80px]"
        />
      </div>

      {/* Rank and Other Rank */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rank">Rank</Label>
          <Input
            id="rank"
            type="number"
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="1"
            min="1"
          />
        </div>
        <div className="space-y-2">
          <Label>Other Rank (Optional)</Label>
          <div className="flex space-x-2">
            <Select value={otherRankPlatform} onValueChange={setOtherRankPlatform}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="ipl">IPL</SelectItem>
                <SelectItem value="x">X</SelectItem>
                <SelectItem value="films">Films</SelectItem>
                <SelectItem value="songs">Songs</SelectItem>
                <SelectItem value="model">Model</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={otherRankNumber}
              onChange={(e) => setOtherRankNumber(e.target.value)}
              placeholder="Rank"
              className="w-20"
              min="1"
            />
          </div>
          <p className="text-xs text-gray-500">
            Example: Select "Instagram" + "6" = "on instagram:#6"
          </p>
        </div>
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Type (Custom trend type)</Label>
        <Input
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="e.g., Viral Dance, Comedy Skit, Tutorial..."
        />
        <p className="text-xs text-gray-500">Describe what type of trend this post represents</p>
      </div>

      {/* Details Link */}
      <div className="space-y-2">
        <Label htmlFor="detailsLink">Details Link</Label>
        <div className="flex">
          <Input
            id="detailsLink"
            value={detailsLink}
            onChange={(e) => setDetailsLink(e.target.value)}
            placeholder="https://example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!detailsLink.trim()}
            onClick={() => detailsLink.trim() && window.open(detailsLink, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full gradient-bg text-white"
        disabled={createPostMutation.isPending}
      >
        {createPostMutation.isPending ? "Creating..." : "Create Video Post"}
      </Button>
    </form>
  );
}