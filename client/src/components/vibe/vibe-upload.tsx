import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Video, Image } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const vibeSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  content: z.string().optional(),
  file: z.any().optional(),
});

type VibeFormData = z.infer<typeof vibeSchema>;

interface VibeUploadProps {
  onClose: () => void;
}

export function VibeUpload({ onClose }: VibeUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VibeFormData>({
    resolver: zodResolver(vibeSchema),
  });

  const uploadVibeMutation = useMutation({
    mutationFn: async (data: VibeFormData) => {
      const formData = new FormData();
      formData.append("title", data.title);
      if (data.content) formData.append("content", data.content);
      if (selectedFile) formData.append("file", selectedFile);

      const response = await fetch("/api/vibes", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to upload vibe");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vibe uploaded successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vibes"] });
      reset();
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload vibe",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 50MB",
          variant: "destructive",
        });
        return;
      }

      const validTypes = ["image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Please select a valid image or video file",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onSubmit = (data: VibeFormData) => {
    uploadVibeMutation.mutate(data);
  };

  const isVideo = selectedFile?.type.startsWith("video/");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Share Your Vibe
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="What's your vibe?"
                className="mt-1"
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="content">Description (Optional)</Label>
              <Textarea
                id="content"
                {...register("content")}
                placeholder="Add a description..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Media</Label>
              {!selectedFile ? (
                <div className="mt-1">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload image or video
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Max 50MB • JPG, PNG, GIF, MP4, WebM
                      </p>
                    </div>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="mt-1 relative">
                  <div className="border rounded-lg overflow-hidden">
                    {isVideo ? (
                      <video
                        src={previewUrl!}
                        className="w-full h-40 object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={previewUrl!}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                      />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeFile}
                    className="absolute top-2 right-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                    {isVideo ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                    <span>{selectedFile.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadVibeMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {uploadVibeMutation.isPending ? "Uploading..." : "Share Vibe"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}