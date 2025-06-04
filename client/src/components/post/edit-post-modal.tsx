import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: number;
    title?: string;
    rank?: number;
    otherRank?: string;
    category?: string;
    type?: string;
    detailsLink?: string;
  };
}

export function EditPostModal({ isOpen, onClose, post }: EditPostModalProps) {
  const [formData, setFormData] = useState({
    title: post.title || "",
    rank: post.rank?.toString() || "",
    otherRank: post.otherRank || "",
    category: post.category || "",
    type: post.type || "",
    detailsLink: post.detailsLink || "",
  });

  const queryClient = useQueryClient();

  const updatePostMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PUT", `/api/posts/${post.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      onClose();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePostMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Textarea
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Post title"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rank">Rank</Label>
              <Input
                id="rank"
                type="number"
                value={formData.rank}
                onChange={(e) => handleChange("rank", e.target.value)}
                placeholder="1"
              />
            </div>
            <div>
              <Label htmlFor="otherRank">Other Rank</Label>
              <Input
                id="otherRank"
                value={formData.otherRank}
                onChange={(e) => handleChange("otherRank", e.target.value)}
                placeholder="#1 on insta"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="youtube"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => handleChange("type", e.target.value)}
                placeholder="reels"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="detailsLink">Full Details Link</Label>
            <Input
              id="detailsLink"
              type="url"
              value={formData.detailsLink}
              onChange={(e) => handleChange("detailsLink", e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePostMutation.isPending}>
              {updatePostMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}