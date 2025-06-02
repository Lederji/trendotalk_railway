import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { insertPostSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

const CATEGORIES = [
  { id: "all", label: "General" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "ipl", label: "IPL" },
  { id: "film", label: "Film" },
  { id: "songs", label: "Songs" },
  { id: "model", label: "Model" },
];

export function CreatePost() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPostSchema.extend({
      isAdminPost: z.boolean().optional(),
    })),
    defaultValues: {
      caption: "",
      category: "all",
      isAdminPost: false,
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("caption", data.caption);
      formData.append("category", data.category);
      if (user?.isAdmin) {
        formData.append("isAdminPost", data.isAdminPost.toString());
      }
      if (selectedFile) {
        formData.append("media", selectedFile);
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sessionId")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create post");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Post created!",
        description: "Your post has been shared successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const onSubmit = (data: any) => {
    createPostMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Media Upload */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Media (Optional)</label>
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            accept="image/*,video/*"
            maxSize={10 * 1024 * 1024} // 10MB
          />
          
          {previewUrl && (
            <Card>
              <CardContent className="p-4">
                {selectedFile?.type.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-64 object-cover rounded"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    className="w-full h-auto max-h-64 object-cover rounded"
                    controls
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Caption */}
        <FormField
          control={form.control}
          name="caption"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caption</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's on your mind?"
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Admin Options */}
        {user?.isAdmin && (
          <FormField
            control={form.control}
            name="isAdminPost"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Admin Post</FormLabel>
                  <div className="text-sm text-gray-500">
                    Post to homepage feed (visible to all users)
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full gradient-bg text-white hover:opacity-90"
          disabled={createPostMutation.isPending}
        >
          {createPostMutation.isPending ? "Creating..." : user?.isAdmin ? "Create Post" : "Create Trend"}
        </Button>
      </form>
    </Form>
  );
}
