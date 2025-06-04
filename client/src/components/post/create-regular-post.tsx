import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function CreateRegularPost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const formData = new FormData();
      formData.append('caption', postData.caption);
      if (postData.link) formData.append('link', postData.link);
      if (media) formData.append('media', media);

      const response = await fetch('/api/posts', {
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
        description: "Post created successfully!",
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
    setCaption("");
    setLink("");
    setMedia(null);
    setMediaPreview("");
  };

  const handleMediaUpload = (file: File) => {
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMedia(null);
    setMediaPreview("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!caption.trim()) {
      toast({
        title: "Error",
        description: "Caption is required",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate({
      caption: caption.trim(),
      link: link.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Media Upload */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Media (Optional)</Label>
        <div className="relative aspect-video border-2 border-dashed border-gray-300 rounded-lg overflow-hidden max-w-md">
          {mediaPreview ? (
            <div className="relative w-full h-full">
              {media?.type.startsWith('video/') ? (
                <video
                  src={mediaPreview}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeMedia}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Upload Image or Video</span>
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMediaUpload(file);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <Label htmlFor="caption">Caption *</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's on your mind..."
          className="min-h-[100px]"
          required
        />
      </div>

      {/* Link */}
      <div className="space-y-2">
        <Label htmlFor="link">Link (Optional)</Label>
        <div className="flex">
          <Input
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2"
            disabled={!link.trim()}
            onClick={() => link.trim() && window.open(link, '_blank')}
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
        {createPostMutation.isPending ? "Creating..." : "Create Post"}
      </Button>
    </form>
  );
}